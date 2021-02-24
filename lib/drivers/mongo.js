'use strict';

const
  Bluebird = require('bluebird'),
  { assign, castArray } = require('lodash'),
  { format } = require('util'),
  MongoClient = require('mongodb').MongoClient,
  ObjectID = require('mongodb').ObjectID;

const connectClient = Bluebird.promisify(MongoClient.connect);

class Mongo {
  constructor (yggdrasil, config, index, collection) {
    this.yggdrasil = yggdrasil;
    this.options = config;
    this.options.retries = this.options.retries || 30;
    this.options.retryDelay = this.options.retryDelay || 1000;
    this.options.useNativeParser = this.options.useNativeParser || true;
    this.options.poolsize = this.options.poolSize || 5;
    this.options.family = this.options.family || null;

    if (index) {
      this.index = index;
    }
    if (collection) {
      this.collection = collection;
    }

    this.client = null;
    this.clientClosing = false;
    this.data = {};
    this.connectionRetries = 0;
  }

  /**
   * Try to connect to mongo. Eventually retry to connect if connect fails
   * yggdrasil.config.mongo.retries defaults to 30
   * yggdrasil.config.mongo.retryDelay defaults to 1000 (ms)
   *
   * @returns {*|Promise<T | never>|*}
   */
  async tryConnect() {
    const
      url = format(
        'mongodb://%s%s:%d/?ssl=%s',
        ((this.options.auth) ? this.options.auth.userName + ':' + this.options.auth.password +'@' : ''),
        this.options.host,
        this.options.port,
        (this.options.useSSL ? 1 : 0)
      );

    if (this.client !== null) {
      return this.client;
    }

    try {
      return await connectClient(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        poolSize: this.options.poolSize,
        family: this.options.family,
        native_parser: this.options.useNativeParser,
        promiseLibrary: Bluebird,
        appname: 'Yggdrasil',
        ssl: this.options.useSSL || 'false',
        sslValidate: this.options.sslValidate || false
      });
    } catch(e) {
      if (this.connectionRetries < this.options.retries) {
        this.yggdrasil.logger.info('☠  Can\'t connect to mongo, retrying...');
        this.connectionRetries++;
        return Bluebird.delay(this.options.retryDelay)
          .then(this.tryConnect());
      }
      this.yggdrasil.logger.info(`☠  Cant connect to mongo, retried ${this.options.retries} times with no success`);
      let err = new Error('Can\'t connect to Mongo');
      err.mongoError = e;
      throw err;
    }
  }

  /**
   * Connect to Mongo
   * @returns {Promise<T | never>}
   */
  async connect() {
    this.client = await this.tryConnect();

    this.yggdrasil.logger.info('⚡ Mongo Connected.');

    process.on('SIGINT', () => {
      this.clientClosing = true;
      this.client.close(false, () => {
        this.yggdrasil.logger.info('Mongo session closed');
      });
    });
    if (this.index) {
      this.data.db = this.client.db(this.index);
      if (this.collection) {
        this.data.collection = this.data.db.collection(this.collection);
      }
    }
    this.startSession(this.options.sessionConfig || undefined);
  }


  /**
   * Close the connexion to Mongo server
   */
  disconnect() {
    return this.client.close();
  }

  /**
   * Returns an hexString from a string or an ObejctId
   * @param id
   * @returns {Object}
   */
  _safeId (id) {
    return (typeof id === 'object') ? id : ObjectID.createFromHexString(id);
  }

  /**
   * Select the index/collection and eventually connect to MongoDB if needed
   *
   * @param index
   * @param collection
   *
   * @returns {Promise.<Collection>} the MongoDB Collection
   */
  selectDbCollection(index, collection) {
    if (this.data.collection) {
      return Bluebird.resolve(this.data.collection);
    }
    if (index === undefined) {
      return Bluebird.reject(new Error('You must provide an index'));
    }
    if (collection === undefined) {
      return Bluebird.reject(new Error('You must provide a collection'));
    }
    if (this.client) {
      const db = this.client.db(index);
      const col = db.collection(collection);
      this.connectionRetries = 0;
      return Bluebird.resolve(col);
    }
    this.yggdrasil.logger.info(`Mongo is not connected...  retry in ${this.options.retryDelay / 1000}s`);
    this.connectionRetries++;
    if (this.connectionRetries === this.options.retries) {
      return Bluebird.reject(new Error('Can\'t connect to Mongo...'));
    }
    return Bluebird.delay(this.options.retryDelay)
      .then(this.connect())
      .then(this.selectDbCollection(index, collection));
  }

  /**
   * Create or update a document
   * @param params
   * @returns {Promise<any | never>}
   */
  set(params) {
    let id = this._safeId(params.id || params._id || this.yggdrasil.uuid());
    if (!ObjectID.isValid(id) || typeof id !== 'object') {
      id = ObjectID.createFromHexString(id);
    }
    delete params.body._id;

    return this.selectDbCollection(params.index, params.collection)
      .then(collection => collection.updateOne(
          {_id: (typeof id === 'object') ? id : ObjectID.createFromHexString(id)},
          {$set: params.body},
          {upsert: true, session: this.session}
        ))
        .then(() => {
          return {
            _id: id,
            body: assign({_id: id}, params.body)
          };
        });
  }

  /**
   * Get a document by calling getOneByQuery
   * @param params
   * @returns {Promise|*}
   */
  get(params) {
    params._id = params.id || params._id;

    if (params._id === undefined) {
      return Bluebird.reject(new Error('You must provide an id'));
    }

    return this.getOneByQuery({
      index: params.index,
      collection : params.collection,
      query: {
        _id: this._safeId(params._id)
      }
    });
  }

  /**
   * perform the getOneByQuery or reject a "not found" error
   * @param params
   * @returns {Promise<Collection | never>}
   */
  getOneByQuery(params) {
    return this.selectDbCollection(params.index, params.collection)
      .then(collection => collection.findOne(params.query || {}, {session: this.session}))
      .then(document => {
        if (document === null) {
          let err = new Error('Not Found.');
          err.status = 404;
          err.message = 'Not Found.';
          err.params = params;
          return Bluebird.reject(err);
        }
        return {
          index: params.index,
          collection: params.collection,
          id: document._id,
          body: document
        };
      });
  }

  delete(params) {
    params._id = params.id || params._id;

    if (params.id === undefined) {
      return Bluebird.reject(new Error('You must provide an id'));
    }

    return this.deleteOneByQuery({
      index: params.index,
      collection: params.collection,
      query: {
        _id: this._safeId(params._id)
      }
    });
  }

  deleteOneByQuery(params) {
    return this.selectDbCollection(params.index, params.collection)
      .then(collection => collection.deleteOne(params.query || {}, {session: this.session}));
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
        session: this.session
      });
    }
    return collection.find(params.query || {}, {session: this.session});
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
    return this.selectDbCollection(params.index, params.collection)
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
    return this.selectDbCollection(params.index, params.collection)
      .then(collection => this._find(collection, params));
  }

  /**
   * Creates a bulk (seriously)
   *
   * @param params
   * @returns {Promise<Collection>}
   */
  bulk(params) {
    return this.selectDbCollection(params.index, params.collection)
      .then(collection => collection.bulkWrite(params.body, {session: this.session}));
  }

  /**
   * Create an index into Mongo
   * @param params
   */
  createIndexes(params) {
    return this.selectDbCollection(params.index, params.collection)
      .then(collection =>  collection.createIndex(params.indexes, {session: this.session}));
  }

  /**
   * Drop an index into Mongo
   * @param indexes
   * @returns {Promise<Collection | never>}
   */
  dropIndexes(indexes) {
    castArray(indexes).forEach(index => {
      console.log('trying to delete index', index);
      const db = this.client.db(index);
      return db.dropDatabase({session: this.session});
    });
  }

  /**
   * Get all the distinct values from a key in a collection
   * @param params
   * @returns {Promise<Collection | never>|Promise}
   */
  getDistinct(params) {
    return this.selectDbCollection(params.index, params.collection)
      .then(collection => collection.distinct(params.key, params.query, {session: this.session}));
  }

  /**
   * Start a mongo session with the given sessionConfig
   * @param sessionConfig
   */
  startSession(sessionConfig) {
    if (sessionConfig) {
      this.session = this.client.startSession(sessionConfig);
    } else {
      this.session = undefined;
    }
  }

  /**
   * Start a transaction on the current session
   */
  async startTestTransaction() {
    await this.session.startTransaction();
  }

  /**
   * Clean up (rollback) the current transaction
   */
  async cleanupTestTransaction() {
    await this.session.abortTransaction();
  }
}

module.exports = Mongo;