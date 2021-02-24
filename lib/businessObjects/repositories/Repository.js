'use strict';

const
  Bluebird = require('bluebird'),
  {castArray, isObject} = require('lodash'),
  dot = require('dot-object');

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
   * - HTTP routes (declared into routesAndListeners.routes) which are Express routers
   * - socketIOListeners (declared into routesAndListeners.socketIOListeners)
   * - eventListeners (declared into routesAndListeners.eventListeners) which are internal event listeners
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
   * @param routesAndListeners{object} - the optional routes and listeners
   * @param controller{object} -  the optional controller
   * @param storage{object} - the optional storage service used for this repository
   */
  constructor(name, index, collection, yggdrasil, routesAndListeners = {}, controller = null, storage = null) {
    this.yggdrasil = yggdrasil;
    this.globalConfig = yggdrasil.config;
    this.name = name;
    this.index = index;
    this.collection = collection;

    this.model = undefined;

    this.routesAndListeners = {
      http: routesAndListeners.routes || null,
      socketIOListeners: routesAndListeners.socketIOListeners || [],
      eventListeners: routesAndListeners.eventListeners || []
    };

    this.controller = controller;

    this.storage = storage || this.yggdrasil.storageService;

    this.registerSocketIOListeners();
    this.registerHTTPRoutes();
    this.registerController();

    this.yggdrasil.logger.info('☕ Repository instantiated:', this.name);
  }

  /**
   * Register some specific socketIO listeners for this repository
   * They will be added to each socket during connection
   * @param listeners
   */
  registerSocketIOListeners(listeners) {
    listeners = listeners || this.routesAndListeners.socketIOListeners;

    this.yggdrasil.socketIOListeners = this.yggdrasil.socketIOListeners.concat(listeners);
  }

  /**
   * Register some specific HTTP routes for this repository
   * They will be added to the router at startup
   * @param routes
   */
  registerHTTPRoutes(routes) {
    routes = routes || this.routesAndListeners.http;
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
  async create(body) {
    const result = await this.checkAndClean(body, true);
    // everythings ok, lets store the cleaned data, if it's not ok, return the error list found by checkAndClean.
    return result.ok
      ? this.set(result.body)
      : result;
  }

  /**
   * Update an object for this repository after having checked it against its model.
   * Its almost the same as create but it wont avoid the creation if some duplicates values are found,
   * if the found duplicates are the object itself
   * @param body
   * @returns {*}
   */
  async update(body) {
    const result = await this.checkAndClean(body, false);
    // everythings ok, lets store the cleaned data, if it's not ok, return the error list found by checkAndClean.
    return result.ok
      ? this.set(result.body)
      : result;
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
  async addAttachment(id, data) {
    let object = await this.get(id);

    object.documents = object.documents || [];

    if (data.attachmentId) {
      object.documents.push(data.attachmentId);
    }
    if (data.attachmentIds) {
      object.documents = object.documents.concat(data.attachmentIds);
    }
    await this.update(object);
    return {documents: object.documents};
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

  async getModel() {
    return this.model || {};
  }

  /**
   * Find duplicates entries based on a value (what) in a key (where) with a caseSensitive behavior or not
   * @param what {string|*} -  the value to look for
   * @param where {string|array} - the key or the keys list, may be in dot notation like 'foo.bar' ou ['foo.bar', 'baz']
   * @returns {Promise<{list: Array}|{list: *}>} - returns only the found object list
   */
  async findDupes(what, where) {
    let queryData = {
      query: {
        $or: []
      }
    };
    let response;

    if (what === null) {
      // we have no value to check : nothing to find
      return {list: []};
    }

    castArray(where).forEach(key => {
      let entry = {};

      entry[key] = new RegExp('^' + what.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'); // case insensitive search, sensitive by default

      queryData.query.$or.push(entry);
    });

    response = await this.list(queryData);
    return {list: response.list};
  }

  /**
   * Check an object format and performs some cleanup
   * @param object
   * @param isNewObject boolean - does the check aims to test an object creation ?
   * @param errors - allow to inject errors for testing purposes
   * @returns {*}
   */
  async checkAndClean(object, isNewObject = false, errors = {}) {
    let flattenObject = {};

    if (!this.model || Object.keys(this.model).length === 0) {
      return {
        ok: true,
        body: object
      };
    }

    // how this object have been created ? via its own interface (default) or via the creation of another object ?
    object.createdVia = object.createdVia || 'default';

    dot.dot(object, flattenObject); // transform the object to a flatten one

    errors = await this.__checkRequiredProperties(flattenObject, errors);
    errors = await this.__checkTypesAndCleanup(flattenObject, errors);
    errors = await this.__checkPropertiesRequiredByPolicies(flattenObject, errors, object);
    errors = await this.__checkUniqueValues(flattenObject, errors, isNewObject);

    // return the errors if any
    if (Object.keys(errors).length > 0) {
      return {errors: errors};
    }
    flattenObject = await this.__formatDependingOnPolicy(flattenObject, object);
    dot.object(flattenObject); // un-flatten the object
    // returns the cleaned object
    return {
      ok: true,
      body: flattenObject
    };
  }

  /**
   * Check if required policies are there
   * @param flattenObject
   * @param errors
   * @returns {Promise<void>}
   * @private
   */
  async __checkRequiredProperties(flattenObject, errors = {}) {
    // check for required properties
    if (this.model.required) {
      if (!this.model.requiredIfCreatedVia) {
        this.model.requiredIfCreatedVia = {
          default: this.model.required
        };
      } else {
        this.model.requiredIfCreatedVia.default = this.model.requiredIfCreatedVia.default || [];
        this.model.requiredIfCreatedVia.default = this.model.requiredIfCreatedVia.default.concat(this.model.required);
      }
    }

    if (this.model.requiredIfCreatedVia && isObject(this.model.requiredIfCreatedVia)) {

      if (this.model.requiredIfCreatedVia[flattenObject.createdVia]) {
        castArray(this.model.requiredIfCreatedVia[flattenObject.createdVia]).forEach(key => {
          // if key is required for this object and has no exception due to user policy, then raise an error
          if (!flattenObject[key]) {
            errors[key] = {
              message: key + ' is required because created via ' + flattenObject.createdVia + ', but not set',
              key: key,
              type: 'required'
            };
          }
        });
      }
    }

    if (this.model.requiredIf) {
      castArray(this.model.requiredIf).forEach(entry => {
        // only check for missing optional elements required
        if (!flattenObject[entry.path]) {
          // check every conditions, on first failed : push in errors and break for this property
          entry.conditions.forEach(condition => {
            if (!errors[entry.path] && condition.operand && condition.operation && flattenObject[condition.operand]) {
              switch (condition.operation) {
                case 'oneOf':
                  if (this.yggdrasil.lib.utils.format.oneOf(flattenObject[condition.operand], condition.oneOf, null) !== null) {
                    errors[entry.path] = {
                      message: entry.path + ' must be set when ' + condition.operand + ' is one of ' + JSON.stringify(condition.oneOf) + '. "' + flattenObject[condition.operand] + '" have been given.',
                      key: entry.path,
                      type: 'required'
                    };
                  }
                  break;
                default:
                  this.yggdrasil.logger.warn(`The "${condition.operation}" is not yet supported (in model from repository "${this.name}")`);
              }
            } else {
              let flatCondition;
              dot.dot(condition, flatCondition);
              if (!condition.operand) {
                this.yggdrasil.logger.warn(`The condition operand is missing (in model from repository "${this.name}") near $(flatCondition}`);
              }
              if (!condition.operation) {
                this.yggdrasil.logger.warn(`The condition operation is missing (in model from repository "${this.name}") near $(flatCondition}`);
              }
            }
          });
        }
      });
    }

    return errors;
  }

  /**
   * First check the types and format each types properly if they can be
   * @param flattenObject
   * @param errors
   * @returns {Promise<void>}
   * @private
   */
  async __checkTypesAndCleanup(flattenObject, errors = {}) {
    if (this.model.formats) {
      castArray(this.model.formats).forEach(entry => {
        switch (entry.type) {
          case 'email':
            if (flattenObject[entry.path]) {
              if (this.yggdrasil.lib.utils.format.email(flattenObject[entry.path]) === null && !errors[entry.path]) {
                errors[entry.path] = {
                  message: entry.path + ' must be a valid email ' + flattenObject[entry.path] + ' have been given.',
                  key: entry.path,
                  type: 'email'
                };
              }
            }
            break;
          case 'phone':
            if (flattenObject[entry.path]) {
              if (this.yggdrasil.lib.utils.format.phone(flattenObject[entry.path]) === null && !errors[entry.path]) {
                errors[entry.path] = {
                  message: entry.path + ' must be a valid phone number ' + flattenObject[entry.path] + ' have been given.',
                  key: entry.path,
                  type: 'phone'
                };
              }
            }
            break;
          case 'trigram':
            if (flattenObject[entry.path]) {
              if (this.yggdrasil.lib.utils.format.trigram(flattenObject[entry.path]) === null && !errors[entry.path]) {
                errors[entry.path] = {
                  message: entry.path + ' must be a valid trigram ' + flattenObject[entry.path] + ' have been given.',
                  key: entry.path,
                  type: 'trigram'
                };
              }
            }
            break;
          case 'oneOf':
            if (flattenObject[entry.path]) {
              if (this.yggdrasil.lib.utils.format.oneOf(flattenObject[entry.path], entry.oneOf, entry.defaultValue) === null && !errors[entry.path]) {
                errors[entry.path] = {
                  message: entry.path + ' must be one of ' + JSON.stringify(entry.oneOf) + ' ' + flattenObject[entry.path] + ' have been given.',
                  key: entry.path,
                  type: 'oneOf'
                };
              }
            }
            break;
          case 'date':
          case 'time':
            if (flattenObject[entry.path]) {
              if (this.yggdrasil.lib.utils.format.dateTime.toUnix(flattenObject[entry.path]) === null && !errors[entry.path]) {
                errors[entry.path] = {
                  message: entry.path + ' must be a valid date representation ' + flattenObject[entry.path] + ' have been given.',
                  key: entry.path,
                  type: 'dateTime'
                };
              }
            }
            break;
          case 'int':
            if (flattenObject[entry.path]) {
              if (this.yggdrasil.lib.utils.format.checkInt(flattenObject[entry.path], entry.minValue, entry.maxValue) === null && !errors[entry.path]) {
                errors[entry.path] = {
                  message: entry.path + ' must be an integer within min value ' + entry.minValue + ' and max value ' + entry.maxValue + ' and ' + flattenObject[entry.path] + ' have been given.',
                  key: entry.path,
                  type: 'int'
                };
              }
            }
            break;
          default:
            this.yggdrasil.logger.warn(`Caution, unknown type "${entry.type}" in ${this.name} Repository model`);
        }
      });
    }
    return errors;
  }

  /**
   * Check if the properties required by some policies are there
   * @param flattenObject
   * @param errors
   * @param object
   * @returns {Promise<void>}
   * @private
   */
  async __checkPropertiesRequiredByPolicies(flattenObject, errors = {}, object) {
    if (this.model.requiredIfPolicy) {
      Object.keys(Object(this.model.requiredIfPolicy)).forEach(key => {
        const policies = castArray(this.model.requiredIfPolicy[key]);
        policies.forEach(policy => {
          if (castArray(object.policies).includes(policy)) {
            if (!flattenObject[key]) {
              //should raise an error only if there is no rule into the createdVia model's section corresponding to the current case
              if (!flattenObject.createdVia || !this.model.requiredIfCreatedVia || (this.model.requiredIfCreatedVia && !this.model.requiredIfCreatedVia[flattenObject.createdVia])) {
                errors[key] = {
                  message: key + ' is required due to policy ' + policy + ' but not set',
                  key: key,
                  type: 'policy',
                  policy: policy
                };
              }
            }
          }
        });
      });
    }
    return errors;
  }

  /**
   * Check if values which must be unique are unique
   * @param flattenObject
   * @param errors
   * @param isNewObject
   * @returns {Promise<void>}
   * @private
   */
  async __checkUniqueValues(flattenObject, errors = {}, isNewObject = false) {
    let promises = [], results;

    if (this.model.mustBeUnique) {
      castArray(this.model.mustBeUnique).forEach(key => {
        if (flattenObject[key]) {

          promises.push(Repository.prototype.findDupes.call(this, flattenObject[key], key)
            .then(result => {
              if (result.list.length > 0) {
                if (!isNewObject) {
                  // are we updating an existing object ?
                  // lets filter the current object from the results
                  result.list = result.list.filter(s => {
                    return (s._id !== flattenObject._id);
                  });

                  if (result.list.length === 0) {
                    // there are no more objects in the result list : no duplicates
                    return Bluebird.resolve(null);
                  }
                }

                return Bluebird.resolve({
                  message: key + ' must be unique. ' + flattenObject[key] + ' is already used.',
                  key: key,
                  type: 'unique'
                });
              }
              return Bluebird.resolve(null);
            })
          );
        }
      });
    }

    results = await Bluebird.all(promises);
    results.forEach(result => { // avoid null responses (no errors)
      if (result !== null) {
        if (!errors[result.key]) {
          errors[result.key] = result;
        }
      }
    });
    return errors;
  }

  /**
   * Check some properties formats when some policies are there
   * @param flattenObject
   * @param object
   * @returns {Promise<*>}
   * @private
   */
  async __formatDependingOnPolicy(flattenObject, object) {
    let formats = this.model.formats || [];

    // cleanup object depending on the model and the current user role if any

    // check if there are policies to ckeck into the object and the format
    if (object.policies && this.model.formatsIfPolicy) {
      object.policies.forEach(policy => {
        if (this.model.formatsIfPolicy[policy]) {
          // adds the formats
          formats = formats.concat(this.model.formatsIfPolicy[policy]);
        }
      });
    }

    castArray(formats).forEach(entry => {
      switch (entry.type) {
        case 'email':
          flattenObject[entry.path] = this.yggdrasil.lib.utils.format.email(flattenObject[entry.path]);
          break;
        case 'phone':
          flattenObject[entry.path] = this.yggdrasil.lib.utils.format.phone(flattenObject[entry.path]);
          break;
        case 'trigram':
          flattenObject[entry.path] = this.yggdrasil.lib.utils.format.trigram(flattenObject[entry.path]);
          break;
        case 'oneOf':
          flattenObject[entry.path] = this.yggdrasil.lib.utils.format.oneOf(flattenObject[entry.path], entry.oneOf, entry.defaultValue);
          break;
        case 'date':
        case 'time':
          flattenObject[entry.path] = this.yggdrasil.lib.utils.format.dateTime.toUnix(flattenObject[entry.path]);
          break;
      }
    });

    return flattenObject;
  }
}

module.exports = Repository;