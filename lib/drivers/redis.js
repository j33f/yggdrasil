'use strict';

const
  Bluebird = require('bluebird'),
  TheRedis = require('ioredis');

class Redis {

  constructor (yggdrasil, config, index, collection) {
    this.yggdrasil = yggdrasil;
    this.options = config;

    if (index) {
      this.index = index;
    }
    if (collection) {
      this.collection = collection;
    }
    this.connectionRetries = 0;
  }

  connect() {
    const yggdrasil = this.yggdrasil;
    let me = this;
    this.client = new TheRedis(Object.assign(this.options, {lazyConnect: true}));
    return this.client.connect()
      .then(() => {
        this.isConnected = true;
        yggdrasil.logger.info('⚡ Redis Connected.');
        return Bluebird.resolve();
      })
      .catch((e) => {
        if (me.connectionRetries < 30) {
          yggdrasil.logger.info('☠  Cant connect to redis, retrying...');
          me.connectionRetries++;
          return me.connect();
        }
        yggdrasil.logger.info('☠  Cant connect to redis, retried 30 times with no success');
        let err = new Error('Cant connect to Redis');
        err.mongoError = e;
        return Bluebird.reject(err);
      });
  }

  /**
   * Close the connexion with Redis
   * @returns {*}
   */
  disconnect() {
    return this.client.quit();
  }

  _keyFromParams(params, noId = false) {
    const
      index = params.index || this.index,
      collection = params.collection || this.collection;

    let id = params.id;
    if (!index) {
      return Bluebird.reject(new Error('No index provided'));
    }
    if (id === undefined && noId === false) {
      return Bluebird.reject(new Error('No id provided'));
    }

    return Bluebird.resolve([index, collection, (id || '')].join('_'));
  }

  get(params) {
    //return Bluebird.reject(new Error('Not Found')); /// DEBUG ONLY

    const
      index = params.index || this.index,
      collection = params.collection || this.collection,
      id = params.id;

    return this._keyFromParams(params)
      .then(key => this.client.get(key))
      .then(response => {
        const data = JSON.parse(response);

        if (data !== null) {
          return {
            index: index,
            collection: collection,
            id: id,
            body: data
          };
        }

        return Bluebird.reject(new Error('Not Found'));
      });
  }

  rawGet(params) {
    return this.client.get('cache_' + params.key)
      .then(response => {
        const data = JSON.parse(response);

        if (data !== null) {
          return Bluebird.resolve(data);
        }

        return Bluebird.reject(new Error('Not Found'));
      });
  }

  set(params) {
    if (!params.body) {
      return Bluebird.reject(new Error('No data provided'));
    }

    return this._keyFromParams(params)
      .then(key => this.client.set(key, JSON.stringify(Object.assign({_id: params.id}, params.body))), 'EX', this.options.ttl || 5);
  }

  rawSet(params) {
    if (params.options && params.options.ttl) {
      return this.client.set('cache_' + params.key, JSON.stringify(params.body), 'EX', params.options.ttl);
    }
    return this.client.set('cache_' + params.key, JSON.stringify(params.body));
  }

  delete(params) {
    return this._keyFromParams(params)
      .then(key => this.client.del(key));
  }

  rawDelete(params) {
    return this.client.del('cache_' + params.key);
  }

  setList(params) {

    if (!params.list) {
      return Bluebird.reject(new Error('No data provided'));
    }

    return this._keyFromParams(params, true)
      .then(key => this.client.set('list_' + key, JSON.stringify(params.list), 'EX', params.ttl || 1));
  }

  getList(params) {
    return this._keyFromParams(params, true)
      .then(key => this.client.get('list_' + key))
      .then(response => {
        if (response === null) {
          let err = new Error('Not found.');
          err.status = 404;
          return Bluebird.reject(err);
        }
        return Bluebird.resolve({
          index: params.index,
          collection: params.collection,
          list: JSON.parse(response)
        });
      });
  }

  flush() {
    return this.client.flushall();
  }
}

module.exports = Redis;
