'use strict';

const Bluebird = require('bluebird');
const TheRedis = require('ioredis');
TheRedis.Promise = Bluebird;

class Redis {
  /**
   * @param yggdrasil
   * @param config
   * @param maxRetries
   * @param redisLib
   */
  constructor (yggdrasil, config, maxRetries, redisLib) {
    this.yggdrasil = yggdrasil;
    this.config = {...config, ...{lazyConnect: true}};
    this.redisLib = redisLib || TheRedis;

    this.connectionRetries = 0;
    this.maxRetries = maxRetries || 30;
    this.client = new this.redisLib(this.config);
    this.isConnected = false;
  }

  /**
   * Connect to redis
   * @returns {Promise<boolean|Promise<boolean|*|undefined>>}
   */
  async connect() {
    try {
      await this.client.connect();
      this.isConnected = true;
      this.yggdrasil.fire('log', 'info', '🗄  Redis Connected.');
      return true;
    } catch (e) {
      if (this.connectionRetries < this.maxRetries) {
        this.yggdrasil.fire('log', 'warn', '🔄  Cant connect to redis, retrying...');
        this.connectionRetries++;
        return this.connect();
      }
      this.yggdrasil.fire('log', 'error', `☠️  Cant connect to redis, retried ${this.maxRetries} times with no success`);
      let err = new Error('Cant connect to Redis');
      err.redisError = e;
      throw err;
    }
  }

  /**
   * Close the connexion with Redis
   * @returns {*}
   */
  disconnect() {
    this.client.disconnect();
    this.yggdrasil.fire('log', 'info', '🔌  Redis is disconnected');
  }

  /**
   * Generate a suitable key from the given parameters index, collection, id|query
   * @param params
   * @param noId - when true, the params.query is used
   * @returns {Promise|*}
   * @private
   */
  _keyFromParams(params, noId = false) {
    const index = params.index;
    const collection = params.collection;
    const query = params.query;
    const id = params.id || params._id;
    if (!index) {
      return Bluebird.reject(new Error('No index provided'));
    }
    if (!collection) {
      return Bluebird.reject(new Error('No collection provided'));
    }
    if (id === undefined && noId === false) {
      return Bluebird.reject(new Error('No id provided'));
    }
    if ((query === undefined || typeof query !== 'object') && noId === true) {
      return Bluebird.reject(new Error('No query provided or query is not an object'));
    }

    return Bluebird.resolve([index, collection, noId ? JSON.stringify(query) : id].join('_'));
  }

  /**
   * Get something depending on the given params : index, collection, id
   * @param params
   * @returns {Promise<T | never>}
   */
  get(params) {
    return this._keyFromParams(params)
      .then(key => this.client.get(key))
      .then(response => {
        const data = JSON.parse(String(response));

        if (data === null) {
          return Bluebird.reject(new Error('Not Found'));
        }

        return Bluebird.resolve({
          index: params.index,
          collection: params.collection,
          id: params.id,
          body: data
        });
      });
  }

  /**
   * Get something depending on the given key
   * @param key
   * @returns {Promise<T | never | never>}
   */
  rawGet(key) {
    return this.client.get(`cache_${key}`)
      .then(response => {
        const data = JSON.parse(response);

        if (data !== null) {
          return Bluebird.resolve(data);
        }

        return Bluebird.reject(new Error('Not Found'));
      });
  }

  /**
   * Set something depending on the given parameters index, collection, id, body, options
   * @param params
   * @returns {Promise|Promise<T | never>}
   */
  set(params) {
    if (!params.body) {
      return Bluebird.reject(new Error('No body provided'));
    }
    params.options = params.options || {};

    return this._keyFromParams(params)
      .then(key => this.client.set(key, JSON.stringify({...{_id: params.id}, ...params.body}), 'EX', params.options.ttl || this.config.ttl || 30));
  }

  /**
   * Set something depending on the given parameters key, body, options
   * @param params
   * @returns {Promise|Promise<T|never>}
   */
  rawSet(params) {
    if (!params.key || String(params.key) !== params.key) {
      return Bluebird.reject(new Error('No key provided, or key is not a string'));
    }
    if (!params.body) {
      return Bluebird.reject(new Error('No body provided'));
    }
    if (params.options && params.options.ttl) {
      return this.client.set(`cache_${params.key}`, JSON.stringify(params.body), 'EX', params.options.ttl);
    }
    return this.client.set(`cache_${params.key}`, JSON.stringify(params.body));
  }

  /**
   * Delete something depending on the given parameters index, collection id
   * @param params
   * @returns {Promise<T | never>}
   */
  delete(params) {
    return this._keyFromParams(params)
      .then(key => this.client.del(key));
  }

  /**
   * Delete something depending on the given key
   * @param key
   * @returns {*}
   */
  rawDelete(key) {
    if (!key || String(key) !== key) {
      return Bluebird.reject(new Error('No key provided, or key is not a string'));
    }
    return this.client.del(`cache_${key}`);
  }

  /**
   * Set a documents list depending on the given params index, collection, query, list, options.ttl
   * @param params
   * @returns {Promise<T | T | never | never>|Promise}
   */
  setList(params) {

    if (!params.list) {
      return Bluebird.reject(new Error('No list provided'));
    }

    params.options = params.options || {};

    return this._keyFromParams(params, true)
      .then(key => this.client.set(`list_${key}`, JSON.stringify(params.list), 'EX', params.options.ttl || 2));
  }

  /**
   * Set a documents list depending on the given params index, collection, query
   * @param params
   * @returns {Promise<T | never | never>}
   */
  getList(params) {
    return this._keyFromParams(params, true)
      .then(key => this.client.get(`list_${key}`))
      .then(response => {
        if (response === null) {
          return Bluebird.reject(new Error('Not Found'));
        }
        return Bluebird.resolve({
          index: params.index,
          collection: params.collection,
          list: JSON.parse(response)
        });
      });
  }

  /**
   * Set a documents list depending on the given params index, collection, query
   * @param params
   * @returns {Promise<T | never | never>}
   */
  deleteList(params) {
    return this._keyFromParams(params, true)
      .then(key => this.client.del(`list_${key}`));
  }

  /**
   * Delete all the keys of all the existing databases, not just the currently selected one. This command never fails.
   * @returns {*}
   */
  flush() {
    return this.client.flushdb();
  }
}

module.exports = Redis;
