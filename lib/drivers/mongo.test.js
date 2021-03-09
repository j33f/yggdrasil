'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const {EventEmitter} = require('events');
require('should-sinon');

const Driver = rewire('./mongo');

let driver, yggdrasil, stubbedDb, stubbedClient, mainStubbedConnectClient, stubbedConnectClient, fakeCollection, stubbedCollection,
  stubbedSession, objectIDIsValid, stubbedToHexString, stubbedCreateFromHexString, stubbed_selectDbCollection, cursor;

fakeCollection = {
  updateOne: sinon.stub().resolves(),
  findOne: sinon.stub().resolves(),
  deleteOne: sinon.stub().resolves(),
  find: sinon.stub().resolves(),
  bulkWrite: sinon.stub().resolves(),
  createIndex: sinon.stub().resolves(),
  distinct: sinon.stub().resolves()
};

stubbedCollection = sinon.stub().returns(fakeCollection);

stubbedSession = {
  abortTransaction: sinon.stub().resolves(),
  commitTransaction: sinon.stub().resolves(),
  startTransaction: sinon.stub(),
  withTransaction: sinon.stub().callsFake(fn => {return fn();}),
  endSession: sinon.stub()
};

const clientEe = new EventEmitter();

stubbedDb = {
  collection: stubbedCollection,
  dropDatabase: sinon.stub()
};

stubbedClient = {
  close: sinon.stub(),
  on: clientEe.on,
  db: sinon.stub().returns(stubbedDb),
  startSession: sinon.stub().returns(stubbedSession)
};

mainStubbedConnectClient = sinon.stub().callsFake((url, options, cb) => {
  cb(null, stubbedClient);
});

Driver.__set__('connectClient', mainStubbedConnectClient);

objectIDIsValid = sinon.stub().returns(true);
stubbedToHexString = sinon.stub().returns('anObjectID');
stubbedCreateFromHexString = sinon.stub().returns({toHexString: stubbedToHexString});

Driver.__set__('ObjectID', {
  isValid: objectIDIsValid,
  createFromHexString: stubbedCreateFromHexString
});

yggdrasil = {
  events: require('@unitTests/mocks/eventsService.stub'),
  lib: require('@unitTests/mocks/lib.stub'),
  uuid: sinon.stub().returns('anUUID')
};

yggdrasil.fire = yggdrasil.events.fire;
yggdrasil.listen = yggdrasil.events.listen;
yggdrasil.listenOnce = yggdrasil.events.listenOnce;

describe('Mongo Driver', () => {
  describe('#topology', () => {
    before(() => {
      driver = new Driver(yggdrasil, {}, null, null, stubbedConnectClient);
    });

    const properties = ['yggdrasil', 'options', 'index', 'collection', 'client', 'data', 'clientClosing'];
    const methods = ['connect', 'disconnect', '_safeId', '_selectDbCollection', 'get', '_getOneByQuery',
      'delete', '_deleteOneByQuery', 'set', '_find', 'list', 'walk', 'bulk', 'createIndexes', 'dropDatabase',
      'getDistinct', 'withSession', 'withSessionNative'];

    properties.forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(driver).have.ownProperty(prop);
      });
    });

    methods.forEach(method => {
      it(`should have the '${method}' method`, () => {
        should(typeof driver[method]).be.eql('function');
      });
    });
  });

  describe('#connect', () => {
    beforeEach(() => {
      stubbedConnectClient = sinon.stub().callsFake((url, options, cb) => {
        cb(null, stubbedClient);
      });

      driver = new Driver(yggdrasil, {}, null, null, stubbedConnectClient);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should call the default MongoDB client lib (without options)', () => {
      driver = new Driver(yggdrasil);

      return driver.connect()
        .then(client => {
          should(mainStubbedConnectClient).have.been.called();
          should(client).be.eql(stubbedClient);
        });
    });

    it('should call the MongoDB client lib (without options)', () => {
      return driver.connect()
        .then(() => {
          should(stubbedConnectClient).have.been.called();
        });
    });

    it('should call the MongoDB client lib (with options)', () => {
      driver = new Driver(yggdrasil, {
        maxRetries: 1,
        retryDelay: 1,
        useNativeParser: false,
        poolsize: 1,
        family: 'foo',
        useSSL: true,
        auth: {
          userName: 'foo',
          password: 'bar'
        }
      }, null, null, stubbedConnectClient);

      return driver.connect()
        .then(() => {
          should(stubbedConnectClient).have.been.called();
        });
    });

    it('should not call the MongoDB client lib if already connected', () => {
      return driver.connect()
        .then(() => {
          sinon.resetHistory();
          return driver.connect();
        })
        .then(() => {
          should(stubbedConnectClient).not.have.been.called();
        });
    });

    it('should retry if connexion fails', async () => {
      stubbedConnectClient = sinon.stub()
        .onFirstCall().callsFake((url, options, cb) => {
          cb(new Error('Fake Mongo Error'));
        })
        .onSecondCall().callsFake((url, options, cb) => {
          cb(null, stubbedClient);
        });

      driver = new Driver(yggdrasil, {
        maxRetries: 2,
        retryDelay: 10
      }, null, null, stubbedConnectClient);

      await driver.connect();
      should(stubbedConnectClient).have.been.calledTwice();
      should(driver.client).be.eqls(stubbedClient);
    });

    it('should fail if connexion fails too many times', () => {
      stubbedConnectClient = sinon.stub().callsFake((url, options, cb) => {
        cb(new Error('Fake Mongo Error'));
      });

      driver = new Driver(yggdrasil, {
        maxRetries: 1,
        retryDelay: 10
      }, null, null, stubbedConnectClient);

      return driver.connect()
        .then(client => {
          console.log(client);
          should(true).be.false('False positive');
        })
        .catch(e => {
          should(e).an.instanceOf(Error);
          should(e.message).be.eql('Cant connect to Mongo');
        });
    });

    it('should use the given index and collection and initiate db and collection', () => {
      driver = new Driver(yggdrasil, {}, 'foo', 'bar', stubbedConnectClient);

      return driver.connect()
        .then(() => {
          should(driver.index).be.eql('foo');
          should(driver.collection).be.eql('bar');
        });
    });

    it('should use the given index and initiate db and collection', () => {
      driver = new Driver(yggdrasil, {}, 'foo', null, stubbedConnectClient);

      return driver.connect()
        .then(() => {
          should(driver.index).be.eql('foo');
          should(driver.collection).be.eql(null);
        });
    });
  });

  describe('#Methods', () => {
    beforeEach(async () => {
      driver = new Driver(yggdrasil, {}, null, null, stubbedConnectClient);
      await driver.connect();
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    describe('#disconnect', () => {
      it ('should call the client.close method', async () => {
        await driver.disconnect();
        should(stubbedClient.close).have.been.called();
        should(yggdrasil.fire).have.been.calledWith('log', 'info');
      });
    });

    describe('#_handleDisconnections', () => {
      it('should try to reconnect if client is not closing voluntarily', async () => {
        driver.connect = sinon.stub().resolves(true);
        await driver._handleDisconnections();
        should(driver.connect).have.been.called();
      });

      it('should not try to reconnect if client is closing voluntarily', async () => {
        driver.connect = sinon.stub().resolves(true);
        driver.clientClosing = true;
        await driver._handleDisconnections();
        should(driver.connect).not.have.been.called();
      });
    });

    describe('#_safeId', () => {
      it ('should returns the given Id if its already an object', async () => {
        const result = driver._safeId({foo: 'bar'});
        should(result).eqls({foo: 'bar'});
        should(stubbedCreateFromHexString).have.not.been.called();
      });

      it ('should returns the Id if its a string', async () => {
        const result = driver._safeId('aString');
        should(stubbedCreateFromHexString).have.been.calledWith('aString');
        should(result.toHexString()).eqls('anObjectID');
      });
    });

    describe('#_selectDbCollection', () => {
      it ('should directly return the collection if it is already selected', async () => {
        driver.data.collection = {a: 'collection'};
        const result = await driver._selectDbCollection('anIndex', 'aCollection');
        should(result).eqls({a: 'collection'});
      });

      it ('should reject with an error if index is missing', async () => {
        const result = driver._selectDbCollection();
        result.should.be.rejectedWith(new Error('You must provide an index'));
      });

      it ('should reject with an error if collection is missing', async () => {
        const result = driver._selectDbCollection('index');
        result.should.be.rejectedWith(new Error('You must provide a collection'));
      });

      it ('should resolves with a collection', async () => {
        sinon.resetHistory();

        const result = driver._selectDbCollection('index', 'collection');
        result.should.be.resolvedWith(fakeCollection);
        should(driver.client.db).have.been.calledWith('index');
        should(driver.client.db().collection).have.been.calledWith('collection');
      });

      it ('should reconnect and perform the action if disconnected', async () => {
        sinon.resetHistory();
        driver.client = null;
        const result = driver._selectDbCollection('index', 'collection');
        result.should.be.resolvedWith(fakeCollection);
      });
    });

    describe('#set', () => {
      beforeEach(() => {
        driver._selectDbCollection = sinon.stub().resolves(fakeCollection);
      });

      it('should store the given document', async () => {
        const params = {
          id: 'anObjectID',
          body: {
            _id: 'foo',
            bar: 'baz'
          },
          meta: {
            foo: 'bar'
          },
          index: 'anIndex',
          collection: 'aCollection'
        };

        const result = await driver.set(params);
        should(result).eqls({
          _id: 'anObjectID',
          body: params.body,
          meta: params.meta
        });
        should(driver._selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.updateOne).have.been.calledWith(
          {_id: {toHexString: stubbedToHexString}},
          {$set: {body: params.body, meta: params.meta}}
        );
      });

      it('should store the given document (id in _id)', async () => {
        const params = {
          _id: 'anObjectID',
          body: {
            _id: 'foo',
            bar: 'baz'
          },
          meta: {
            foo: 'bar'
          },
          index: 'anIndex',
          collection: 'aCollection'
        };

        const result = await driver.set(params);
        should(result).eqls({
          _id: 'anObjectID',
          body: params.body,
          meta: params.meta
        });
        should(driver._selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.updateOne).have.been.calledWith(
          {_id: {toHexString: stubbedToHexString}},
          {$set: {body: params.body, meta: params.meta}}
        );
      });

      it('should store the given document (id in body._id)', async () => {
        const params = {
          body: {
            _id: 'anObjectID',
            bar: 'baz'
          },
          meta: {
            foo: 'bar'
          },
          index: 'anIndex',
          collection: 'aCollection'
        };

        const result = await driver.set(params);
        should(result).eqls({
          _id: 'anObjectID',
          body: params.body,
          meta: params.meta
        });
        should(driver._selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.updateOne).have.been.calledWith(
          {_id: {toHexString: stubbedToHexString}},
          {$set: {body: params.body, meta: params.meta}}
        );
      });

      it('should store the given document (no id)', async () => {
        const params = {
          body: {
            bar: 'baz'
          },
          meta: {
            foo: 'bar'
          },
          index: 'anIndex',
          collection: 'aCollection'
        };

        const result = await driver.set(params);
        should(result).eqls({
          _id: 'anObjectID',
          body: params.body,
          meta: params.meta
        });
        should(driver._selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.updateOne).have.been.calledWith(
          {_id: {toHexString: stubbedToHexString}},
          {$set: {body: params.body, meta: params.meta}}
        );
      });

      it('should store the given document (not valid ID)', async () => {
        const params = {
          id: 23,
          body: {
            bar: 'baz'
          },
          meta: {
            foo: 'bar'
          },
          index: 'anIndex',
          collection: 'aCollection'
        };

        driver._safeId = sinon.stub().returns(params.id);

        const result = await driver.set(params);
        should(result).eqls({
          _id: 'anObjectID',
          body: params.body,
          meta: params.meta
        });
        should(driver._selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.updateOne).have.been.calledWith(
          {_id: {toHexString: stubbedToHexString}},
          {$set: {body: params.body, meta: params.meta}}
        );
      });
    });

    describe('#get', () => {
      beforeEach(() => {
        driver._safeId = sinon.stub().returns('anObjectID');
        driver._getOneByQuery = sinon.stub().resolves();
      });
      it('should reject if no id given', () => {
        const params = {
          index: 'index',
          collection: 'collection'
        };

        return driver.get(params)
          .then(() => {
            throw new Error('False negative');
          })
          .catch(error => {
            should(error).eqls(new Error('You must provide an id'));
          });
      });

      it('should call _getOneByQuery', async () => {
        const params = {
          id: 'anObjectID',
          index: 'index',
          collection: 'collection'
        };

        await driver.get(params);
        should(driver._getOneByQuery).have.been.calledWith({
          index: 'index',
          collection: 'collection',
          query: {
            _id: params.id
          }
        });
      });
    });

    describe('#_getOneByQuery', () => {
      beforeEach(() => {
        fakeCollection.findOne = sinon.stub().resolves({a: 'document'});
        stubbed_selectDbCollection = sinon.stub().resolves(fakeCollection);
        driver._selectDbCollection = stubbed_selectDbCollection;
      });

      it('should call this._selectDbCollection and collection.findOne with given params, and return the right document', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          query: {
            _id: 'anId'
          }
        };
        const result = await driver._getOneByQuery(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.findOne).have.been.calledWith(params.query);
        should(result).eqls({
          index: params.index,
          collection: params.collection,
          a: 'document'
        });
      });

      it('should call collection.findOne with {} if query is missing', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection'
        };
        await driver._getOneByQuery(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.findOne).have.been.calledWith({});
      });

      it('reject if the document is not found', () => {
        fakeCollection.findOne = sinon.stub().resolves(null);
        stubbed_selectDbCollection = sinon.stub().resolves(fakeCollection);
        driver._selectDbCollection = stubbed_selectDbCollection;

        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          query: {
            _id: 'anId'
          }
        };
        let err = new Error('Not Found');
        err.status = 404;
        err.params = params;

        return driver._getOneByQuery(params)
          .then(() => {
            should(false).be.true('False success');
          })
          .catch(error => {
            should(error).eqls(err);
          });
      });
    });

    describe('#delete', () => {
      beforeEach(() => {
        driver._deleteOneByQuery = sinon.stub().resolves({});
        driver._safeId = sinon.stub().returns('anObjectID');
      });
      it('should reject if no id given', () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
        };

        return driver.delete(params)
          .then(() => {
            should(true).be.false('False success');
          })
          .catch(error => {
            should(error).eqls(new Error('You must provide an id'));
          });
      });

      it('should call this._deleteOneByQuery with the right parameters (params.id)', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          id: 'anObjectID'
        };

        await driver.delete(params);
        should(driver._deleteOneByQuery).have.been.calledWith({
          index: params.index,
          collection: params.collection,
          query: {
            _id: 'anObjectID'
          }
        });
      });

      it('should call this._deleteOneByQuery with the right parameters (params._id)', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          _id: 'anObjectID'
        };

        await driver.delete(params);
        should(driver._deleteOneByQuery).have.been.calledWith({
          index: params.index,
          collection: params.collection,
          query: {
            _id: 'anObjectID'
          }
        });
      });
    });

    describe('#_deleteOneByQuery', () => {
      beforeEach(() => {
        stubbed_selectDbCollection = sinon.stub().resolves(fakeCollection);
        driver._selectDbCollection = stubbed_selectDbCollection;
      });

      it('should call this._selectDbCollection and collection.deleteOne with given params, and resolves', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          query: {
            _id: 'anId'
          }
        };
        await driver._deleteOneByQuery(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.deleteOne).have.been.calledWith(params.query);
      });

      it('should call collection.deleteOne with {} if query is missing', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection'
        };
        await driver._deleteOneByQuery(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.deleteOne).have.been.calledWith({});
      });
    });

    describe('#_find', () => {
      it ('should call the collection.find properly', async () => {
        await driver._find(fakeCollection, {query: 'a query', projection: {a: 'projection'}});
        should(fakeCollection.find).have.been.calledWith('a query', {a: 'projection', session: undefined});
      });

      it ('should call the collection.find with {} as a query if no query given', async () => {
        await driver._find(fakeCollection, {});
        should(fakeCollection.find).have.been.calledWith({});
      });
    });

    describe('#list', () => {
      beforeEach(() => {
        stubbed_selectDbCollection = sinon.stub().resolves(fakeCollection);
        driver._selectDbCollection = stubbed_selectDbCollection;
        cursor = {
          toArray: sinon.stub().returns([])
        };
        driver._find = sinon.stub().resolves(cursor);
      });

      it('should call this._selectDbCollection and this._find with the right parameters', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          query: {
            a: 'query'
          }
        };

        await driver.list(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(driver._find).have.been.calledWith(fakeCollection, params);
        should(cursor.toArray).have.been.called();
      });
    });

    describe('#walk', () => {
      beforeEach(() => {
        stubbed_selectDbCollection = sinon.stub().resolves(fakeCollection);
        driver._selectDbCollection = stubbed_selectDbCollection;
        cursor = {
          toArray: sinon.stub().returns([])
        };
        driver._find = sinon.stub().resolves(cursor);
      });

      it('should call this._selectDbCollection and this._find with the right parameters', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          query: {
            a: 'query'
          }
        };

        const result = await driver.walk(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(driver._find).have.been.calledWith(fakeCollection, params);
        should(result).eqls(cursor);
      });
    });

    describe('#bulk', () => {
      beforeEach(() => {
        stubbed_selectDbCollection = sinon.stub().resolves(fakeCollection);
        driver._selectDbCollection = stubbed_selectDbCollection;
      });

      it('should call this._selectDbCollection and this._find with the right parameters', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          body: {
            a: 'body'
          }
        };

        await driver.bulk(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.bulkWrite).have.been.calledWith(params.body);
      });
    });

    describe('#createIndexes', () => {
      beforeEach(() => {
        stubbed_selectDbCollection = sinon.stub().resolves(fakeCollection);
        driver._selectDbCollection = stubbed_selectDbCollection;
      });

      it('should call this._selectDbCollection and collection.createIndex with the right parameters', async () => {
        const params = {
          name: 'anIndex',
          collection: 'aCollection',
          indexes: {
            anElement: 'anOption',
            geo: 'geoSpatial',
            another: 'one'
          }
        };

        await driver.createIndexes(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.createIndex).have.been.calledThrice();
        should(fakeCollection.createIndex.getCall(0)).have.been.calledWith({anElement: 'anOption'});
        should(fakeCollection.createIndex.getCall(1)).have.been.calledWith({geo: '2dsphere'});
        should(fakeCollection.createIndex.getCall(2)).have.been.calledWith({another: 'one'});
      });
    });

    describe('#dropDatabase', () => {
      it('should call client.db and db.dropDatabase with the right parameters', async () => {
        await driver.dropDatabase('anIndex');
        should(stubbedClient.db).have.been.calledWith('anIndex');
        should(stubbedDb.dropDatabase).have.been.called();
      });

      it('should call client.db and db.dropDatabase as many time as required', async () => {
        await driver.dropDatabase(['foo', 'bar', 'baz']);
        should(stubbedClient.db).have.been.calledThrice('anIndex');
        should(stubbedClient.db.getCall(0)).have.been.calledWith('foo');
        should(stubbedClient.db.getCall(1)).have.been.calledWith('bar');
        should(stubbedClient.db.getCall(2)).have.been.calledWith('baz');
        should(stubbedDb.dropDatabase).have.been.calledThrice();
      });
    });

    describe('#getDistinct', () => {
      beforeEach(() => {
        stubbed_selectDbCollection = sinon.stub().resolves(fakeCollection);
        driver._selectDbCollection = stubbed_selectDbCollection;
      });

      it('should call this._selectDbCollection and collection.distinct with the right parameters', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          key: 'foo',
          query: {
            a: 'query'
          }
        };
        await driver.getDistinct(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.distinct).have.been.calledWith(params.key, params.query);
      });

      it('should call collection.distinct with an empty query if query is not set', async () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection',
          key: 'foo'
        };
        await driver.getDistinct(params);
        should(stubbed_selectDbCollection).have.been.calledWith(params.index, params.collection);
        should(fakeCollection.distinct).have.been.calledWith(params.key, {});
      });

      it('should reject if key is not set', () => {
        const params = {
          index: 'anIndex',
          collection: 'aCollection'
        };
        return driver.getDistinct(params)
          .then(() => {
            should(true).be.false('False success');
          })
          .catch(error => {
            should(error).eqls(new Error('key parameter is mandatory'));
          });
      });
    });

    describe('#withSession', () => {
      it('should start a session and then a transation within it, then call the given func, then commit the transaction, then close the session', async () => {
        const stubFunc = sinon.stub().resolves();

        await driver.withSession(stubFunc, {an: 'option'}, {another: 'option'});
        should(stubbedClient.startSession).have.been.calledWith({an: 'option'});
        should(stubbedSession.startTransaction).have.been.calledWith({another: 'option'});
        should(stubbedSession.commitTransaction).have.been.called();
        should(stubbedSession.abortTransaction).have.not.been.called();
        should(stubbedSession.endSession).have.been.called();
        should(stubFunc).have.been.called();
      });

      it('should start a session and then a transation within it, then call the given func, then commit the transaction, then close the session with no parameters', async () => {
        const stubFunc = sinon.stub().resolves();

        await driver.withSession(stubFunc);
        should(stubbedClient.startSession).have.been.calledWith({});
        should(stubbedSession.startTransaction).have.been.calledWith({});
        should(stubbedSession.commitTransaction).have.been.called();
        should(stubbedSession.abortTransaction).have.not.been.called();
        should(stubbedSession.endSession).have.been.called();
        should(stubFunc).have.been.called();
      });

      it('should not call commit if asked not to', async () => {
        const stubFunc = sinon.stub().resolves();

        await driver.withSession(stubFunc, {an: 'option'}, {another: 'option'}, true);
        should(stubbedClient.startSession).have.been.calledWith({an: 'option'});
        should(stubbedSession.startTransaction).have.been.calledWith({another: 'option'});
        should(stubbedSession.commitTransaction).have.not.been.called();
        should(stubbedSession.abortTransaction).have.been.called();
        should(stubbedSession.endSession).have.been.called();
        should(stubFunc).have.been.called();
      });

      it('should not call commit if function fails', () => {
        const stubFunc = sinon.stub().rejects(new Error('Some Error'));

        return driver.withSession(stubFunc, {an: 'option'}, {another: 'option'})
          .then(() => {
            should(true).be.false('False success');
          })
          .catch(e => {
            should(stubbedClient.startSession).have.been.calledWith({an: 'option'});
            should(stubbedSession.startTransaction).have.been.calledWith({another: 'option'});
            should(stubbedSession.commitTransaction).have.not.been.called();
            should(stubbedSession.endSession).have.been.called();
            should(stubFunc).have.been.called();
            should(e).eqls(new Error('Some Error'));
          });
      });

      it('should reject directly if the given fn is not a function', () => {

        return driver.withSession('stubFunc', {an: 'option'}, {another: 'option'})
          .then(() => {
            should(true).be.false('False success');
          })
          .catch(e => {
            should(stubbedClient.startSession).have.not.been.called();
            should(e).eqls(new Error('fn must be a function'));
          });
      });
    });

    describe('#withSessionNative', () => {
      it('should start a session and then call native session.withTransaction method with right parameters', async () => {
        const stubFunc = sinon.stub().resolves();

        await driver.withSessionNative(stubFunc, {an: 'option'}, {another: 'option'});
        should(stubbedClient.startSession).have.been.calledWith({an: 'option'});
        should(stubbedSession.withTransaction).have.been.calledWith(stubFunc, {another: 'option'});
        should(stubbedSession.endSession).have.been.called();
        should(stubFunc).have.been.called();
      });

      it('should start a session and then call native session.withTransaction method with default parameters', async () => {
        const stubFunc = sinon.stub().resolves();

        await driver.withSessionNative(stubFunc);
        should(stubbedClient.startSession).have.been.calledWith({});
        should(stubbedSession.withTransaction).have.been.calledWith(stubFunc, {});
        should(stubbedSession.endSession).have.been.called();
        should(stubFunc).have.been.called();
      });

      it('should close the session before to reject', () => {
        const stubFunc = sinon.stub().rejects(new Error('Some Error'));

        return driver.withSessionNative(stubFunc, {an: 'option'}, {another: 'option'})
          .then(() => {
            should(true).be.false('False success');
          })
          .catch(e => {
            should(stubbedSession.endSession).have.been.called();
            should(e).eqls(new Error('Some Error'));
          });
      });

      it('should reject if the given fn is not a function', () => {

        return driver.withSessionNative('stubFunc', {an: 'option'}, {another: 'option'})
          .then(() => {
            should(true).be.false('False success');
          })
          .catch(e => {
            should(stubbedClient.startSession).have.not.been.called();
            should(e).eqls(new Error('fn must be a function'));
          });
      });
    });
  });
});