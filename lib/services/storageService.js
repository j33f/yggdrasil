'use strict';

// Bluebird is used here rather than async/await for performances issues,
// since this class is about to be called on each and every time data are CRUDLS
// (created, red, updated, deleted, listed or searched), we aim to get as less latency as possible.
// see https://blog.kuzzle.io/bluebird-native-async_await-javascript-promises-performances-2020
const Bluebird = require('bluebird');
const {assign, isArray, castArray, fill, zipObject} = require('lodash');

const safeId = (id) => {
  return (typeof id === 'object') ? id.toHexString() : id;
};

class Storage {
  constructor(yggdrasil, index, collection) {

    this.yggdrasil = yggdrasil;
    this.options = yggdrasil.config;

    if (index) {
      this.index = index;
      if (collection) {
        this.collection = collection;
      }
    }

    this.redis = this.yggdrasil.storage.redis;
    this.mongo = this.yggdrasil.storage.mongo;
  }

  /**
   * Creates or updates an object in storage. Updates first in cache (redis) then in db (mongodb).
   * Default is replace mode, if need to have a partial object update, specify params.partial = true.
   * @param params if contains property id, set is in update mode, if no property id, set is in create mode
   * @returns {object} created or updated object
   */
  set(params) {
    let data = {
      index: params.index || this.index,
      collection: params.collection || this.collection,
      body: params.body,
      id: params.objectId || params.id || params._id || params.body.id || params.body._id
    };
    let newObject = false;

    if (!data.id) {
      newObject = true;
      data.id = this.yggdrasil.uuid();
    }
    if (!data.index) {
      return Bluebird.reject(new Error('No index provided'));
    }
    if (!data.body) {
      return Bluebird.reject(new Error('No body provided'));
    }
    if (newObject) {
      return this.redis.set(data)
        .then(() => this.mongo.set(data))
        .then(resp => {
          resp._id = safeId(resp._id);
          resp.body._id = safeId(resp.body._id);

          if (this.yggdrasil.socketIoController) {
            if (newObject) {
              this.yggdrasil.socketIoController.broadcast('create/' + data.index + '/' + data.collection);
            } else {
              this.yggdrasil.socketIoController.broadcast('update/' + data.index + '/' + data.collection);
            }
          }
          return Bluebird.resolve(resp);
        });
    }

    // Update an existing document
    return this.get({
      index: data.index,
      collection: data.collection,
      id: data.id
    })
      .catch(() => {
        // the document do not exists (was submitted with a forced ID)
        return this.redis.set(data)
          .then(() => this.mongo.set(data))
          .then(resp => {
            resp._id = safeId(resp._id);
            resp.body._id = safeId(resp.body._id);

            if (this.yggdrasil.socketIoController) {
              this.yggdrasil.socketIoController.broadcast('create/' + data.index + '/' + data.collection);
            }

            return Bluebird.resolve(resp);
          });
      })
      .then(oldDocument => {
        let setData = {
          index: data.index,
          collection: data.collection,
          id: data.id
        };
        if (params.replaceObject) {
          setData.body = data.body;
        } else {
          setData.body = assign(oldDocument.body, data.body);
        }
        return this.redis.set(setData)
          .then(() => this.mongo.set(setData))
          .then(resp => {
            resp._id = safeId(resp._id);
            resp.body._id = safeId(resp.body._id);

            if (this.yggdrasil.socketIoController) {
              this.yggdrasil.socketIoController.broadcast('update/' + data.index + '/' + data.collection + '/' + resp._id);
            }

            return Bluebird.resolve(resp);
          });
      });
  }

  /**
   * Get object from repository. First in cache (redis), then in db (mongodb).
   * If object is not found in cache, then it is added in cache
   * @param {object} params - object that specifies criteria for get. mandatory properties : index (takes collection index if unspecified), id (or _id)
   * @returns {object} - object specified in params. Rejects if no index, or no id specified
   */
  get(params) {
    const data = {
      index: params.index || this.index,
      collection: params.collection || this.collection,
      id: params.id || params._id
    };

    if (!data.index) {
      return Bluebird.reject(new Error('No index provided'));
    }
    if (!data.id) {
      return Bluebird.reject(new Error('No id provided'));
    }

    return Bluebird.resolve()
      .then(() => {
        if (params.nocache) {
          return this.mongo.get(data)
            .then(resp => {
              resp._id = safeId(resp._id);
              return Bluebird.resolve(resp);
            });
        }
        return this.redis.get(data);
      })
      .catch(() => {
        // not in cache or redis error
        // get the document from mongo
        return this.mongo.get(data)
          .then(resp => {
            resp._id = safeId(resp._id);
            // set redis cache
            if (params.nocache) {
              return Bluebird.resolve(resp);
            }
            return this.redis.set(resp)
              .then(() => { // we want to return resp !
                return Bluebird.resolve(resp);
              });
          });
      });
  }

  async delete(params) {
    const data = {
      index: params.index || this.index,
      collection: params.collection || this.collection,
      id: params.id,
    };

    if (!data.index) {
      return Bluebird.reject(new Error('No index provided'));
    }
    if (!data.id) {
      return Bluebird.reject(new Error('No id provided'));
    }

    if (this.yggdrasil.socketIoController) {
      this.yggdrasil.socketIoController.broadcast('delete/' + data.index + '/' + data.collection + '/' + data.id);
    }

    await this.redis.delete(data);
    await this.mongo.delete(data);
    return ({
      status: 'ok',
      data: data
    });
  }

  /**
   * List all documents of a collection
   *
   * @param {object} params - index & collection to list
   * @returns {Promise|*|Promise<T>}
   */
  list(params) {
    let data = {
      index: params.index || this.index,
      collection: params.collection || this.collection,
      query: params.query || {},
      limit: params.limit || 0
    };
    if (params.projection) {
      data.projection = params.projection;
    }

    if (!data.index) {
      return Bluebird.reject(new Error('No index provided'));
    }

    return this.mongo.list(data)
      .then(resp => {
        const response = {
          index: data.index,
          collection: data.collection,
          query: data.query,
          projection: data.projection,
          list: resp.map(e => {
            e._id = safeId(e._id);
            return e;
          })
        };
        return Bluebird.resolve(response);
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
    const data = {
      index: params.index || this.index,
      collection: params.collection || this.collection,
      query: params.query || {},
      projection: params.projection || null
    };
    return this.mongo.walk(data);
  }

  /**
   * Create a bulk (seriously)
   * @param params
   * @returns {*|Promise}
   */
  bulk(params) {
    if (!params.index) {
      return Bluebird.reject(new Error('You must provide an index'));
    }
    if (!params.collection) {
      return Bluebird.reject(new Error('You must provide a collection'));
    }
    if (!params.body) {
      return Bluebird.reject(new Error('You must provide a body'));
    }
    if (!isArray(params.body)) {
      return Bluebird.reject(new Error('You must provide an array as body'));
    }
    if (params.body.length === 0) {
      this.yggdrasil.logger.info('Empty Bulk Body');
      return Bluebird.resolve({});
    }

    return this.mongo.bulk(params);
  }

  /**
   * Create an index into Mongo
   * @param params
   */
  createIndexes(params) {
    const indexes = castArray(params.indexes);
    const values = fill(Array(indexes.length), 1);
    const data = {
      index: params.index || this.index,
      collection: params.collection || this.collection,
      indexes: zipObject(indexes, values)
    };

    return this.mongo.createIndexes(data);
  }

  /**
   * Drop an index into Mongo
   * @param params
   * @returns {Promise|void}
   */
  dropIndexes(indexes) {
    this.mongo.dropIndexes(indexes);
    this.redis.flush();
  }

  /**
   * Get distinct values for the params.key field
   * @param params
   */
  getDistinct(params) {
    const data = {
      index: params.index || this.index,
      collection: params.collection || this.collection,
      query: params.query || {},
      key: params.key || null
    };

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
