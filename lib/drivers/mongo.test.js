'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const {EventEmitter} = require('events');
require('should-sinon');

const Driver = rewire('./mongo');

let driver, yggdrasil, stubbedClient, mainStubbedConnectClient, stubbedConnectClient, fakeCollection, stubbedCollection,
  stubbedSession, objectIDIsValid, stubbedToHexString, stubbedCreateFromHexString;

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
  abortTransaction: sinon.stub(),
  startTransaction: sinon.stub(),
};

const clientEe = new EventEmitter();

stubbedClient = {
  close: sinon.stub(),
  on: clientEe.on,
  db: sinon.stub().returns({
    collection: stubbedCollection,
    dropDatabase: sinon.stub(),
    startSession: sinon.stub().returns(stubbedSession),
  })
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
      'delete', '_deleteOneByQuery', 'set', '_find', 'list', 'walk', 'bulk', 'createIndex', 'dropDatabase', 'getDistinct',
      'startSession', 'startTestTransaction'];

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

  describe('Methods', () => {
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

    describe('#_safeId', () => {
      it ('should returns the given Id if its already an object', async () => {
        const result = driver._safeId({foo: 'bar'});
        should(result).eqls({foo: 'bar'});
        should(stubbedCreateFromHexString).have.not.been.called();
      });

      it ('should returns the Id if its a string', async () => {
        const result = driver._safeId('aString');
        should(result).eqls({toHexString:'AnObjectID'});
        should(stubbedCreateFromHexString).have.been.calledWith('aString');
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
  });
});