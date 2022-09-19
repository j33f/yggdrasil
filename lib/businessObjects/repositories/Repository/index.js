'use strict';

const Bluebird = require('bluebird');
const dot = require('dot-object');
const {castArray} = require('lodash');
const express = require('express');
const validation = require('./dataValidation');
const controllerFactory = require('./controllerFactory');
const routerFactory = require('./routerFactory');
const sioListenersFactory = require('./sioListenersFactory');

class Repository {
  /**
   * Root class for repositories
   *
   * A repository represent a data type to deal with
   * It is attached to an index and a collection into the database.
   *
   * It can have a model (added directly by the child class constructor)
   *
   * It can declare :
   * - HTTP routes (declared into options.routes) which are Express routers
   * - socketIOListeners (declared into options.socketIOListeners)
   * - eventListeners (declared into options.eventListeners) which are internal event listeners
   * - a specific controller (declared into controller) which is an object containing some function to deal with some
   * specific things about the business object
   *
   * The doctrine is quite simple and loose at the same time :
   * - everything which is related to data lives into the repository
   * - everything which deals with requests or events lives into routes and listeners
   * - everything which deals with controls, pre-check or specific manipulations before to store, or utilitaries pruposes
   * lives in the controller
   *
   * To sum up, from the database/Storage level to the api level :
   * DB/Storage => Repository => controller => routes and listeners
   *
   * Note that the controller is not mandatory at all, neither routes and listeners nor model.
   * A Repository is just a low level interface to CRUDLS (create, read, update, delete, list, search) objects
   *
   * The model is both a list of constraints applied to the data and a last time checklist to validate data against.
   * Look at the check functions. for more details but quite everything is possible.
   * Of course you can deal and rely only on Mongo schema, but these, since they resides into your repository, are more
   * flexible and fine tuned than them.
   *
   * You can override the internal storage service per repository if you want to use some other data storage (couch, elastic, postgres..)
   * In this case, you have to create an abstraction layer on your own, having the same crudls methods than the internal one.
   *
   * @param name{string} - the repository name
   * @param index{string} - the index to use (will be created when the first document will be stored)
   * @param collection{string} - the collection to use into the index (will be created when the first document will be stored)
   * @param yggdrasil - the Yggdrasil object
   * @param options{object} - the optional routes, listeners, controllers, model and storage
   */
  constructor(name, index, collection, yggdrasil, options = {}) {
    this.yggdrasil = yggdrasil;
    this.globalConfig = yggdrasil.config;
    this.name = name;
    this.index = index;
    this.collection = collection;

    this.protected = (options.protected);

    this._model = options.model || {};

    // initialize the controller
    this._defaultController = controllerFactory(this.yggdrasil, this);
    this.controller = {...this._defaultController, ...Object(options.controller)}; // merge default routes with custom ones

    // initialize HTTP routes
    this.router = express.Router();
    if (!this.protected) {
      this._defaultRoutes = routerFactory(this.yggdrasil, this);
      this.router.use('/', this._defaultRoutes);
    }
    if (options.routes) {
      this.router.use('/', options.routes);
    }

    // initialize socket.io listeners
    options.socketIOListeners = options.socketIOListeners || [];
    this.socketIOListeners = sioListenersFactory(this.yggdrasil, this, options.socketIOListeners);

    // initialize the internal events listeners
    this.eventListeners = options.eventListeners || [];

    this.storage = options.storage || this.yggdrasil.storageService;

    this.registerSocketIOListeners();
    this.registerHTTPRoutes();
    this.registerController();

    this.yggdrasil.fire('log', 'info', `🧩  Repository instantiated: ${this.name}`);
  }

  /**
   * Register some specific socketIO listeners for this repository
   * They will be added to each socket during connection
   * @param listeners
   */
  registerSocketIOListeners(listeners) {
    listeners = listeners || this.socketIOListeners;

    this.yggdrasil.socketIOListeners = this.yggdrasil.socketIOListeners.concat(listeners);
  }

  /**
   * Register some specific HTTP routes for this repository
   * They will be added to the router at startup
   * @param router
   */
  registerHTTPRoutes(router) {
    router = router || this.router;
    if (router) {
      this.yggdrasil.lib.controllers.router.addRouter(`/${this.name.toLowerCase()}`, router, `${this.name} repository`, this.yggdrasil);
    }
  }

  /**
   * Register the controller
   * @param controller
   */
  registerController(controller) {
    controller = controller || this.controller;
    this.yggdrasil.lib.controllers[this.name.toLowerCase()] = controller;
  }

  /**
   * Change/set this repository index and/or collection
   * Used mainly for functional tests to be performed
   * @param index
   * @param collection
   */
  _setIndexCollection(index, collection) {
    this.index = index || this.index;
    this.collection = collection || this.collection;
  }

  /**
   * Inject the repository's index/collection into the given parameters in order to symplify the process and modularize
   * @param params
   * @returns {object} params
   */
  _injectIndexCollection(params) {
    params.index = this.index;
    params.collection = this.collection;

    return params;
  }

  /**
   * Create document metadata
   * @param userId
   * @param meta
   * @private
   */
  _createDocumentMeta(userId, meta = {}) {
    meta.createdAt = meta.createdAt || Date.now() / 1000 | 0;
    meta.createdBy = meta.createdBy || userId;
    meta.updatedAt = Date.now() / 1000 | 0;
    meta.updateBy = userId;
    return meta;
  }

  /**
   * Get an element
   * @param _id {string} - element _id
   * @param noCache {boolean} - whether or not to retrieve the data directly from the database or from cache
   * @returns {*}
   */
  get(_id, noCache = false) {
    return this.storage.get(this._injectIndexCollection({
      _id: _id,
      noCache: noCache
    }));
  }

  /**
   * Create a new Object for this repository after having checked it against its model and eventually reformatted its data.
   * @param body
   * @param userId
   * @returns {*}
   */
  create(body, userId = null) {
    return this.checkAndClean(body, true)
      .then(result => {
        if (result.ok) {
          // everything ok, lets store the cleaned data, if it's not ok, return the error list found by checkAndClean.
          const document = {
            _id: this.yggdrasil.uuid(true),
            body: result.body,
            meta: this._createDocumentMeta(userId)
          };
          return this.set(document);
        }
        let error = new Error('Requirements not met according to the model.');
        error.errors = result.errors;
        return Bluebird.reject(error);
      });
  }

  /**
   * Update an object for this repository after having checked it against its model.
   * Its almost the same as create but it wont avoid the creation if some duplicates values are found,
   * if the found duplicates are the object itself
   * @param document
   * @param userId
   * @returns {*|PromiseLike<T | never>|Promise<T | never>}
   */
  update(document, userId = null) {
    return this.checkAndClean(document.body, false)
      .then(result => {
        // everything is ok, lets store the cleaned data, if it's not ok, return the error list found by checkAndClean.
        if (result.ok) {
          const _document = {
            _id: document._id,
            body: result.body,
            meta: this._createDocumentMeta(userId, document.meta || {})
          };
          return this.set(_document);
        }
        let error = new Error('Requirements not met according to the model.');
        error.errors = result.errors;
        return Bluebird.reject(error);
      });
  }

  /**
   * Create or update an element without check !!!
   *
   * Consider using create or update to perform model checks
   * @param document
   * @returns {*}
   */
  set(document) {
    return this.storage.set(this._injectIndexCollection(document));
  }

  /**
   * Delete an object
   * @param _id
   * @returns {*}
   */
  delete(_id) {
    return this.storage.delete(
      this._injectIndexCollection({
        _id: _id
      })
    );
  }

  /**
   * Add one or many attachments _id(s) to an object
   * @param _id
   * @param data
   * @returns {Promise<{documents: *}>}
   */
  addAttachment(_id, data) {
    return this.get(_id)
      .then(object => {
        object.body.attachments = object.body.attachments || [];

        if (data.attachmentId) {
          object.body.attachments.push(data.attachmentId);
        }
        if (data.attachmentIds) {
          object.body.attachments = object.body.attachments.concat(data.attachmentIds);
        }
        return this.update(object)
          .then(() => {return {attachments: object.body.attachments};});
      });
  }

  //////

  list(params) {
    return this.storage.list(this._injectIndexCollection(params));
  }

  search(params) {
    return this.storage.search(this._injectIndexCollection(params));
  }

  walk(params) {
    return this.storage.walk(this._injectIndexCollection(params));
  }

  getDistinct(params) {
    return this.storage.getDistinct(this._injectIndexCollection(params));
  }

  /////

  cache(params) {
    return this.storage.cache(params);
  }

  getCache(params) {
    return this.storage.getCache(params);
  }

  delCache(params) {
    return this.storage.delCache(params);
  }

  /////

  /**
   * Set the repo model
   * @param m{object} -  the model to set
   */
  set model(m) {
    this._model = m;

    this._model.required = castArray(this._model.required || []);
    this._model.requiredIfPolicy = Object(this._model.requiredIfPolicy) || {};
  }

  get model() {
    return this._model;
  }

  /**
   * Find case insensitive duplicates entries based on a value (what) in a key (where)
   *
   * @param what {string|*} -  the value to look for
   * @param where {string|array<string>} - the key or the keys list, in dot notation like 'foo.bar' or ['foo.bar', 'baz']
   * @param excludeId {string|null} - an _id to exclude form results
   * @returns {Promise<{list: Array}|{list: *}>} - returns only the found object list
   */
  findDupes(what, where, excludeId = null) {
    let query = [];

    if (what === null) {
      // we have no value to check: nothing to find
      return Bluebird.resolve({list: []});
    }

    castArray(where).forEach(key => {
      let entry = {};

      entry[key] = new RegExp('^' + what.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'); // case insensitive search, sensitive by default

      query.push(entry);
    });

    return this.list({
      query: {
        $or: query
      }
    })
      .then(response => {
        return {
          list: response.list.filter(s => {
            return s._id !== excludeId;
          })
        };
      });
  }

  /**
   * This is the first phase of checking data
   * @param object
   * @param flattenObject
   * @param isNewObject
   * @param errors
   * @returns {Promise<void | never>}
   * @private
   */
  _checkData(object, flattenObject, isNewObject, errors) {
    const promises = [
      validation.checkRequiredProperties(this, flattenObject, errors),
      validation.checkTypesAndCleanup(this, flattenObject, errors),
      validation.checkPropertiesRequiredByPolicies(this, flattenObject, object.policies, errors),
      validation.checkUniqueValues(this, flattenObject, errors, isNewObject)
    ];

    return Bluebird.all(promises)
      .then(results => {
        let finalErrors = {};
        results.forEach(result => {
          finalErrors = {...finalErrors, ...result};
        });
        return finalErrors;
      })
      .then(finalErrors => {
        if (Object.keys(finalErrors).length > 0) {
          return Bluebird.resolve({
            ok: false,
            errors: finalErrors
          });
        }
        return Bluebird.resolve({
          ok: true
        });
      });
  }

  /**
   * Check an object format and performs some cleanup
   * @param object
   * @param isNewObject boolean - does the check aims to test an object creation ?
   * @param errors - allow to inject errors for testing purposes
   * @returns {*}
   */
  checkAndClean(object, isNewObject = false, errors = {}) {
    if (!this.model || Object.keys(this.model).length === 0) {
      return Bluebird.resolve({
        ok: true,
        body: object
      });
    }

    let flattenObject = dot.dot(object); // transform the object to a flatten one

    return this._checkData(object, flattenObject, isNewObject, errors)
      .then(checkResults => {
        if (checkResults.ok) {
          return validation.formatDependingOnPolicy(this, flattenObject, object)
            .then(response => {
              dot.object(response); // un-flatten the object, dot re-inject the response into the given var
              // returns the cleaned object
              return Bluebird.resolve({
                ok: true,
                body: response
              });
            });
        }
        return Bluebird.resolve(checkResults);
      });
  }
}

module.exports = Repository;