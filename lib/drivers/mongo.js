'use strict';

const Bluebird = require('bluebird');
const {castArray} = require('lodash');
const {format} = require('util');
const MongoClient = require('mongodb').MongoClient;
const ObjectID = require('mongodb').ObjectID;
const connectClient = MongoClient.connect;

class Mongo {
  constructor(yggdrasil, config, index, collection, mongoConnect) {
    this.yggdrasil = yggdrasil;
    this.options = config || {};
    this.options.maxRetries = this.options.maxRetries || 30;
    this.options.retryDelay = this.options.retryDelay || 1000;
    this.options.useNativeParser = this.options.useNativeParser || true;
    this.options.poolsize = this.options.poolSize || 5;
    this.options.family = this.options.family || null;

    this.index = index;
    this.collection = collection;

    this.mongoConnect = (mongoConnect) ? Bluebird.promisify(mongoConnect) : Bluebird.promisify(connectClient);

    this.client = null;
    this.clientClosing = false;
    this.data = {};

    const auth = ((this.options.auth) ? this.options.auth.userName + ':' + this.options.auth.password + '@' : '');

    this.mongoUrl = format(
      'mongodb://%s%s:%d/?ssl=%s',
      auth,
      this.options.host,
      this.options.port,
      (this.options.useSSL ? 1 : 0)
    );

    this.mongoConnectOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      poolSize: this.options.poolSize,
      family: this.options.family,
      native_parser: this.options.useNativeParser,
      promiseLibrary: Bluebird,
      appname: 'Yggdrasil',
      ssl: this.options.useSSL || 'false',
      sslValidate: this.options.sslValidate || false
    };
  }

  /**
   * Connect to Mongo
   *
   * @returns {Promise<Promise<T | Promise>|*>}
   */
  async connect() {
    if (this.client) {
      return Bluebird.resolve(this.client);
    }

    return this.yggdrasil.lib.utils.retry(
      () => {
        return this.mongoConnect(this.mongoUrl, this.mongoConnectOptions);
      },
      {
        maxRetries: this.options.maxRetries,
        delay: this.options.retryDelay
      },
      () => {
        this.yggdrasil.fire('log', 'warn', '🔄  Cant connect to Mongo, retrying...');
      }
    )
      .then(client => {
        this.client = client;
        this.yggdrasil.fire('log', 'info', '🗄  Mongo Connected.');

        if (this.index) {
          this.data.db = this.client.db(this.index);
          if (this.collection) {
            this.data.collection = this.data.db.collection(this.collection);
          }
        }

        // handle close event
        this.client.on('close', this._handleDisconnections);
        return Bluebird.resolve(this.client);
      })
      .catch(e => {
        this.yggdrasil.fire('log', 'error', `☠️  Cant connect to Mongo, retried ${this.options.maxRetries} times with no success`);
        let error = new Error('Cant connect to Mongo');
        error.mongoError = e;
        return Bluebird.reject(error);
      });
  }

  /**
   * Close the connexion to Mongo server
   *
   * @returns {*}
   */
  disconnect() {
    this.clientClosing = true;

    return this.client.close(false, () => {
      /* istanbul ignore next */
      this.yggdrasil.fire('log', 'info', '🗄  Mongo session closed');
    });
  }

  /**
   * Handle a Mongo disconnection
   *
   * @returns {Promise<null|any>}
   * @private
   */
  async _handleDisconnections() {
    if (!this.clientClosing) {
      this.client = null;

      // this not a voluntary closing
      this.yggdrasil.fire('log', 'warn', '🔄  Mongo connexion closed unexpectedly, retrying to connect');
      await this.connect();
    }
    return this.client;
  }

  /**
   * Returns an hexString from a string or an ObejctId
   * @param id
   * @returns {Object}
   */
  _safeId(id) {
    return (typeof id === 'object') ? id : ObjectID.createFromHexString(id);
  }

  /**
   * Select the index/collection and eventually connect to MongoDB if needed
   *
   * @param index
   * @param collection
   * @returns {Promise<Promise<*|*|*|*|*>|Promise|*>}
   * @private
   */
  async _selectDbCollection(index, collection) {
    if (this.data.collection) {
      return Bluebird.resolve(this.data.collection);
    }
    if (index === undefined) {
      return Bluebird.reject(new Error('You must provide an index'));
    }
    if (collection === undefined) {
      return Bluebird.reject(new Error('You must provide a collection'));
    }

    try {
      const db = this.client.db(index);
      const col = db.collection(collection);
      return Bluebird.resolve(col);
    } catch(e) {
      this.yggdrasil.fire('log', 'warn', 'Select db/collection caused an error: ', e.message);
      this.yggdrasil.fire('log', 'warn', 'Trying to reconnect to Mongo');
      await this._handleDisconnections();
      return this._selectDbCollection(index, collection);
    }
  }

  /**
   * Create or update a document
   * @param params
   * @returns {Promise<any | never>}
   */
  set(params) {
    let id = this._safeId(params.id || params._id || params.body._id || this.yggdrasil.uuid());
    if (!ObjectID.isValid(id) || typeof id !== 'object') {
      id = ObjectID.createFromHexString(id);
    }
    delete params.body._id;

    return this._selectDbCollection(params.index, params.collection)
      .then(collection => collection.updateOne(
        {_id: id},
        {$set: {body: params.body, meta: params.meta}},
        {upsert: true, session: params.session}
      ))
      .then(() => {
        return {
          _id: id.toHexString(),
          body: params.body,
          meta: params.meta
        };
      });
  }

  /**
   * Get a document by calling _getOneByQuery
   * @param params
   * @returns {Promise|*}
   */
  get(params) {
    params._id = params.id || params._id;

    if (params._id === undefined) {
      return Bluebird.reject(new Error('You must provide an id'));
    }

    return this._getOneByQuery({
      index: params.index,
      collection: params.collection,
      query: {
        _id: this._safeId(params._id)
      }
    });
  }

  /**
   * perform the _getOneByQuery or reject a "not found" error
   * @param params
   * @returns {Promise<Collection | never>}
   */
  _getOneByQuery(params) {
    return this._selectDbCollection(params.index, params.collection)
      .then(collection => collection.findOne(params.query || {}, {session: params.session || null}))
      .then(document => {
        if (document === null) {
          let err = new Error('Not Found');
          err.status = 404;
          err.params = params;
          return Bluebird.reject(err);
        }
        return Bluebird.resolve({
          index: params.index,
          collection: params.collection,
          ...document
        });
      });
  }

  /**
   * Delete a document
   * @param params
   * @returns {Promise|*}
   */
  delete(params) {
    params._id = params.id || params._id;

    if (params._id === undefined) {
      return Bluebird.reject(new Error('You must provide an id'));
    }

    return this._deleteOneByQuery({
      index: params.index,
      collection: params.collection,
      query: {
        _id: this._safeId(params._id)
      }
    });
  }

  /**
   * Delete a document depending on a query
   * @param params
   * @returns {Promise<OrderedBulkOperation | UnorderedBulkOperation | Promise<*> | Promise | * | never>}
   * @private
   */
  _deleteOneByQuery(params) {
    return this._selectDbCollection(params.index, params.collection)
      .then(collection => collection.deleteOne(params.query || {}, {session: params.session || null}));
  }

  /**
   * Perform a find on the collection
   * @param collection
   * @param params
   * @returns {*}
   * @private
   */
  _find(collection, params) {
    if (params.projection) {
      return collection.find(params.query || {}, {
        ...params.projection,
        session: params.session
      });
    }
    return collection.find(params.query || {}, {session: params.session || null});
  }

  /**
   * List all elements for the given optional query.
   *
   * When no given query, list all the documents from the collection.
   * Always resolves, with an empty list if no results.
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  list(params) {
    return this._selectDbCollection(params.index, params.collection)
      .then(collection => this._find(collection, params))
      .then(cursor => cursor.toArray());
  }

  /**
   * Same as search or list but respond with plain MongoDB Cursor allowing to walk the results
   *
   * @param params
   * @returns {Promise.Cursor}
   */
  walk(params) {
    return this._selectDbCollection(params.index, params.collection)
      .then(collection => this._find(collection, params));
  }

  /**
   * Creates a bulk (seriously)
   *
   * @param params
   * @returns {Promise<Collection>}
   */
  bulk(params) {
    return this._selectDbCollection(params.index, params.collection)
      .then(collection => collection.bulkWrite(params.body, {session: params.session || null}));
  }

  /**
   * Create an index into Mongo
   * @param params {index: <string>, collection: <string>, indexes: {indexName: type}}
   */
  createIndexes(params) {
    let indexes = [];
    Object.keys(params.indexes).forEach(name => {
      let index = {};
      if (params.indexes[name].toLowerCase() === 'geospatial') {
        index[name] = '2dsphere';
      } else {
        index[name] = params.indexes[name];
      }
      indexes.push(index);
    });

    return this._selectDbCollection(params.index, params.collection)
      .then(collection => {
        let promises = [];
        indexes.forEach(index => {
          promises.push(collection.createIndex(index, {session: params.session || null}));
        });
        return Bluebird.all(promises);
      });
  }

  /**
   * Drop an index into Mongo
   * @param indexes
   * @param session
   * @returns {Promise<Collection | never>}
   */
  dropDatabase(indexes, session = null) {
    castArray(indexes).forEach(index => {
      const db = this.client.db(index);
      return db.dropDatabase({session: session});
    });
  }

  /**
   * Get all the distinct values from a key in a collection
   * @param params
   * @returns {Promise<Collection | never>|Promise}
   */
  getDistinct(params) {
    if (!params.key) {
      return Bluebird.reject(new Error('key parameter is mandatory'));
    }
    return this._selectDbCollection(params.index, params.collection)
      .then(collection => collection.distinct(params.key, params.query || {}, {session: params.session || null}));
  }

  /**
   * Perform commands within a session
   * @param fn{PromiseLike}
   * @param sessionConfig
   * @param transactionConfig
   * @param doNotCommit
   * @returns {*|PromiseLike<T | never>|Promise<T | never>}
   */
  withSession(fn, sessionConfig = {}, transactionConfig = {}, doNotCommit = false) {
    if (typeof fn !== 'function') {
      return Bluebird.reject(new Error('fn must be a function'));
    }

    let results;

    const session = this.client.startSession(sessionConfig);
    session.startTransaction(transactionConfig);

    return fn()
      .then(res => {
        results = res;
        if (doNotCommit) {
          return session.abortTransaction();
        }
        return session.commitTransaction();
      })
      .catch(e => {
        session.endSession();
        return Bluebird.reject(e);
      })
      .then(() => {
        session.endSession();
        return Bluebird.resolve(results);
      });
  }

  /**
   * Same as withSession but using the native implementation
   * @param fn
   * @param sessionConfig
   * @param transactionConfig
   * @returns {Promise<T | Promise>}
   */
  withSessionNative(fn, sessionConfig = {}, transactionConfig = {}) {
    if (typeof fn !== 'function') {
      return Bluebird.reject(new Error('fn must be a function'));
    }

    const session = this.client.startSession(sessionConfig);

    return session.withTransaction(fn, transactionConfig)
      .then(results => {
        session.endSession();
        return Bluebird.resolve(results);
      })
      .catch(e => {
        session.endSession();
        return Bluebird.reject(e);
      });
  }
}

module.exports = Mongo;