'use strict';

// Bluebird is used here rather than async/await for performances issues,
// since this class is about to be called on each and every time data are CRUDLS
// (created, red, updated, deleted, listed or searched), we aim to get as less latency as possible.
// see https://blog.kuzzle.io/bluebird-native-async_await-javascript-promises-performances-2020
const Bluebird = require('bluebird');
const {merge, isArray} = require('lodash');

class Storage {
  constructor(yggdrasil, index, collection) {

    this.yggdrasil = yggdrasil;

    this.index = index || null;
    this.collection = collection || null;

    this.redis = this.yggdrasil.storage.redis;
    this.mongo = this.yggdrasil.storage.mongo;

    this._safeId = this.mongo._safeId;
  }

  /**
   * Format a suitable data object
   * @param params
   * @returns {{index: *, collection: *, id: *, body: *}}
   * @private
   */
  _formatData(params) {
    params = params || {};
    const defaultData = {
      index: this.index,
      collection: this.collection,
      query: {},
      limit: 0
    };
    let finalData = {...defaultData, ...params};
    finalData.id = params.objectId || params.id || params._id;
    if (!finalData.id && params.body) {
      finalData.id = params.body.id || params.body._id;
    }
    return finalData;
  }

  /**
   * Set an object (create or update)
   * @param data
   * @param event
   * @returns {PromiseLike<T | never>}
   * @private
   */
  _setObject(data, event = 'create') {
    return this.redis.set(data)
      .then(() => this.mongo.set(data))
      .then(resp => {
        resp._id = this._safeId(resp._id);
        resp.body._id = this._safeId(resp.body._id);

        this.yggdrasil.fire(`${event}/${data.index}/${data.collection}`, data);
        return Bluebird.resolve(resp);
      });
  }

  /**
   * Check if the required parameters are present and non empty
   * @param data
   * @param requiredParams
   * @private
   */
  _checkParameters(data, requiredParams = ['index', 'collection']) {
    data = data || {};
    try {
      requiredParams.forEach(param => {
        if (data[param] ===  null || data[param] === undefined) {
          throw new Error(`No ${param} provided`);
        }
        if (typeof data[param] === 'string' && data[param].trim() === '') {
          throw new Error(`Empty ${param} provided`);
        }
        if (typeof data[param] === 'object' && !Object.keys(data[param]).length) {
          throw new Error(`Empty ${param} provided`);
        }
      });
    } catch(e) {
      return e;
    }
    return true;
  }

  /**
   * Creates or updates an object in storage. Updates first in cache (redis) then in db (mongodb).
   * Default is replace mode, if need to have a partial object update, specify params.partial = true.
   * @param params if contains property id, set is in update mode, if no property id, set is in create mode
   * @returns {object} created or updated object
   */
  set(params) {
    let data = this._formatData(params);
    let newObject = false;

    if (!data.id) {
      // no id given : its a new ohject to store
      newObject = true;
      data.id = this.yggdrasil.uuid();
    }

    const dataValidation = this._checkParameters(data, ['index', 'collection', 'body']);
    if(dataValidation instanceof Error) {
      return Bluebird.reject(dataValidation);
    }

    if (newObject) {
      return this._setObject(data);
    }

    // Update an existing document
    return this.get({
      index: data.index,
      collection: data.collection,
      id: data.id
    })
       .then(oldDocument => {
        if (params.replaceObject) {
          // replace completely the document
          return this._setObject(data, 'update');
        }
        data = merge(oldDocument, data);
        return this._setObject(data, 'update');
      })
      .catch(() => {
        // the document do not exists (was submitted with a forced ID)
        return this._setObject(data);
      });
  }

  /**
   * Put get result into cache
   * @param resp
   * @returns {*|PromiseLike<T | never>|Promise<T | never>}
   * @private
   */
  _cacheGet(resp) {
    resp._id = this._safeId(resp._id);
    return this.redis.set(resp)
      .then(() => { // we want to return resp !
        return Bluebird.resolve(resp);
      });
  }

  /**
   * Get object from repository. First in cache (redis), then in db (mongodb).
   * If object is not found in cache, then it is added in cache
   * @param {object} params - object that specifies criteria for get. mandatory properties : index (takes collection index if unspecified), id (or _id)
   * @returns {object} - object specified in params. Rejects if no index, or no id specified
   */
  get(params) {
    const data = this._formatData(params);

    const dataValidation = this._checkParameters(data, ['index', 'collection', 'id']);
    if(dataValidation instanceof Error) {
      return Bluebird.reject(dataValidation);
    }

    if (params.noCache) {
      return this.mongo.get(data)
        .then(resp => this._cacheGet(resp));
    }
    return this.redis.get(data)
      .catch(() => {
        // not in cache or redis error
        // get the document from mongo
        return this.mongo.get(data)
          .then(resp => this._cacheGet(resp));
      });
  }

  delete(params) {
    const data = this._formatData(params);

    const dataValidation = this._checkParameters(data, ['index', 'collection', 'id']);
    if(dataValidation instanceof Error) {
      return Bluebird.reject(dataValidation);
    }

    return this.redis.delete(data)
      .then(this.mongo.delete(data))
      .then(() => {
        this.yggdrasil.fire('delete/' + data.index + '/' + data.collection + '/' + data.id);
        return ({
          status: 'ok',
          data: data
        });
      });
  }

  /**
   * Format a list result
   * @param data
   * @param resp
   * @returns {{query: *, index: *, collection: *, projection: (*|projection|{a}|string|Object), list: *}}
   * @private
   */
  _formatList(data, resp) {
    return {
      index: data.index,
      collection: data.collection,
      query: data.query,
      projection: data.projection,
      list: resp.map(e => {
        e._id = this._safeId(e._id);
        return e;
      })
    }
  }

  /**
   * Put a list result into cache
   * @param data
   * @param resp
   * @returns {Promise<T|never>|Promise}
   * @private
   */
  _cacheList(data, resp) {
    const response = this._formatList(data, resp);
    return this.redis.setList(response)
      .then(()=> { return response; });
  }

  /**
   * List all documents of a collection
   *
   * @param {object} params - index & collection to list
   * @returns {Promise|*|Promise<T>}
   */
  list(params) {
    params = params || {};
    let data = this._formatData(params);
    if (params.projection) {
      data.projection = params.projection;
    }

    const dataValidation = this._checkParameters(data, ['index', 'collection']);
    if(dataValidation instanceof Error) {
      return Bluebird.reject(dataValidation);
    }

    if (params.noCache) {
      return this.mongo.list(data)
        .then(resp => this._cacheList(data, resp));
    }

    return this.redis.getList(data)
      .catch(() => {
        return this.mongo.list(data)
          .then(resp => this._cacheList(data, resp));
      });
  }

  /**
   * Like list but rejects if no results, and adds a body member if there is only one result
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  search(params) {
    return this.list(params)
      .then(response => {
        if (response.list.length === 0) {
          return Bluebird.reject(new Error('Not Found')); // reject if no results
        }
        if (response.list.length === 1) {
          response.body = response.list[0];
          return Bluebird.resolve(response); // simulate search one
        }
        return Bluebird.resolve(response);
      });
  }

  /**
   * Walk a query or a whole collection.
   *
   * Example use:
   * walk(params)
   *  .then(cursor => {
   *    while (cursor.hasNext()) {
   *      let document = cursor.next();
   *    }
   *  });
   *
   *  It gives direct access to the MongoDB Cursor object.
   * @param {object} params
   * @returns {Cursor} a MongoDb Cursor to use with hasNext and next
   */
  walk(params) {
    const data = this._formatData(params);

    const dataValidation = this._checkParameters(data, ['index', 'collection']);
    if(dataValidation instanceof Error) {
      return Bluebird.reject(dataValidation);
    }

    return this.mongo.walk(data);
  }

  /**
   * Create a bulk (seriously)
   * @param params
   * @returns {*|Promise}
   */
  bulk(params) {
    const dataValidation = this._checkParameters(params, ['index', 'collection']);
    if(dataValidation instanceof Error) {
      return Bluebird.reject(dataValidation);
    }
    if (!isArray(params.body)) {
      return Bluebird.reject(new Error('You must provide an array as body'));
    }
    if (params.body.length === 0) {
      this.yggdrasil.fire('log', 'info', 'Empty Bulk Body');
      return Bluebird.resolve({});
    }

    return this.mongo.bulk(params)
      .then(this.redis.flush());
  }

  /**
   * Drop an index into Mongo
   * @param indexes
   * @returns {Promise|void}
   */
  dropDatabase(indexes) {
    this.mongo.dropDatabase(indexes);
    this.redis.flush();
  }

  /**
   * Get distinct values for the params.key field
   * @param params
   */
  getDistinct(params) {
    let data = this._formatData(params);

    const dataValidation = this._checkParameters(data, ['index', 'collection', 'key']);
    if(dataValidation instanceof Error) {
      return Bluebird.reject(dataValidation);
    }

    return this.mongo.getDistinct(data);
  }

  /**
   * put something into Redis cache
   * @param params
   * @returns {*}
   */
  setCache (params) {
    return this.redis.rawSet(params);
  }

  /**
   * delete something from Redis cache
   * @param params
   * @returns {*}
   */
  delCache (params) {
    return this.redis.rawDelete(params);
  }

  /**
   * delete something from Redis cache
   * @param params
   * @returns {*}
   */
  getCache (params) {
    return this.redis.rawGet(params);
  }
}

module.exports = Storage;