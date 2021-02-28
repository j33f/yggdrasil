'use strict';

const Bluebird = require('bluebird');
const dot = require('dot-object');
const {castArray} = require('lodash');
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

    this._model = options.model || {};

    this.routerFactory = routerFactory;
    this._defaultRoutes = this.routerFactory(this.yggdrasil, this);
    this.routes = options.routes || this._defaultRoutes;

    this.sioListenersFactory = sioListenersFactory;
    this._defaultIOListeners = this.sioListenersFactory(this.yggdrasil, this);
    this.socketIOListeners = options.socketIOListeners || this._defaultIOListeners;

    this.eventListeners = options.eventListeners || [];

    this.controllerFactory = controllerFactory;
    this._defaultController = this.controllerFactory(this.yggdrasil, this);
    this.controller = options.controller || this._defaultController;

    this.storage = options.storage || this.yggdrasil.storageService;

    this.registerSocketIOListeners();
    this.registerHTTPRoutes();
    this.registerController();

    this.yggdrasil.logger.info(`🧩  Repository instantiated: ${this.name}`);
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
   * @param routes
   */
  registerHTTPRoutes(routes) {
    routes = routes || this.routes;
    if (routes) {
      this.yggdrasil.lib.controllers.router.addRoute(`/${this.name.toLowerCase()}`, routes, `${this.name} repository`, this.yggdrasil);
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
  setIndexCollection(index, collection) {
    this.index = index || this.index;
    this.collection = collection || this.collection;
  }

  /**
   * Inject the repository's index/collection into the given parameters in order to symplify the process and modularize
   * @param params
   * @returns {object} params
   */
  injectIndexCollection(params) {
    params.index = this.index;
    params.collection = this.collection;

    return params;
  }

  /**
   * Get an element
   * @param id {string} - element id
   * @param nocache {boolean} - whether or not to retrieve the data directly from the database or from cache
   * @returns {*}
   */
  get(id, nocache = false) {
    return this.storage.get(this.injectIndexCollection({
      id: id,
      nocache: nocache
    }));
  }

  /**
   * Create a new Object for this repository after having checked it against its model and eventually reformatted its data.
   * @param body
   * @returns {*}
   */
  create(body) {
    return this.checkAndClean(body, true)
      .then(result => {
        // everythings ok, lets store the cleaned data, if it's not ok, return the error list found by checkAndClean.
        return result.ok
          ? this.set(result.body)
          : result;
      });
  }

  /**
   * Update an object for this repository after having checked it against its model.
   * Its almost the same as create but it wont avoid the creation if some duplicates values are found,
   * if the found duplicates are the object itself
   * @param body
   * @returns {*|PromiseLike<T | never>|Promise<T | never>}
   */
  update(body) {
    return this.checkAndClean(body, false)
      .then(result => {
        // everythings ok, lets store the cleaned data, if it's not ok, return the error list found by checkAndClean.
        return Bluebird.resolve(result.ok
          ? this.set(result.body)
          : result);
      });
  }

  /**
   * Create or update an element without check !!!
   *
   * Consider using create or update to perform model checks
   * @param body
   * @param id
   * @returns {*}
   */
  set(body, id) {
    return this.storage.set(
      this.injectIndexCollection({
        body: body,
        id: id
      })
    );
  }

  /**
   * Delete an object
   * @param id
   * @returns {*}
   */
  delete(id) {
    return this.storage.delete(
      this.injectIndexCollection({
        id: id
      })
    );
  }

  /**
   * Add one or many attachments id(s) to an object
   * @param id
   * @param data
   * @returns {Promise<{documents: *}>}
   */
  addAttachment(id, data) {
    return this.get(id)
      .then(object => {
        object.documents = object.documents || [];

        if (data.attachmentId) {
          object.documents.push(data.attachmentId);
        }
        if (data.attachmentIds) {
          object.documents = object.documents.concat(data.attachmentIds);
        }
        return this.update(object)
          .then(() => {return object});
      })
      .then(object => {
        return {documents: object.documents};
      });
  }

  //////

  list(params) {
    return this.storage.list(this.injectIndexCollection(params));
  }

  search(params) {
    return this.storage.search(this.injectIndexCollection(params));
  }

  walk(params) {
    return this.storage.walk(this.injectIndexCollection(params));
  }

  getDistinct(params) {
    return this.storage.getDistinct(this.injectIndexCollection(params));
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
    this._model.requiredIfCreatedVia = Object(this._model.requiredIfCreatedVia || {});
    this._model.requiredIfCreatedVia.default = this._model.requiredIfCreatedVia.default || this._model.required;
    this._model.required.map(k => {
      if (!this._model.requiredIfCreatedVia.default.includes(k)) {
        this._model.requiredIfCreatedVia.default.push(k);
      }
    });
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
   * @param excludeId {string|null} - an Id to exclude form results
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
        } else {
          return Bluebird.resolve({
            ok: true
          });
        }
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
    let flattenObject = {};

    if (!this.model || Object.keys(this.model).length === 0) {
      return Bluebird.resolve({
        ok: true,
        body: object
      });
    }

    // how this object have been created ? via its own interface (default) or via the creation of another object ?
    object.createdVia = object.createdVia || 'default';

    dot.dot(object, flattenObject); // transform the object to a flatten one

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