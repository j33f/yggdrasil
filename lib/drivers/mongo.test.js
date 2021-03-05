'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
require('should-sinon');

const Driver = rewire('./mongo');

let driver, yggdrasil, stubbedClient, mainStubbedConnectClient, stubbedConnectClient, fakeCollection, stubbedCollection, stubbedSession, objectIDIsValid;

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

stubbedClient = {
  close: sinon.stub(),
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
Driver.__set__('ObjectID', {
  isValid: objectIDIsValid,
  createFromHexString: sinon.stub().returns({toHexString:'AnObjectID'})
});

yggdrasil = {
  events: require('@unitTests/mocks/eventsService.stub'),
};

yggdrasil.fire = yggdrasil.events.fire;
yggdrasil.listen = yggdrasil.events.listen;
yggdrasil.listenOnce = yggdrasil.events.listenOnce;

describe('Mongo Driver', () => {
  describe('#topology', () => {
    before(() => {
      driver = new Driver(yggdrasil, {}, null, null, stubbedConnectClient);
    });

    const properties = ['yggdrasil', 'options', 'index', 'collection', 'client', 'data', 'clientClosing', 'connectionRetries'];
    const methods = ['_tryConnect', 'connect', 'disconnect', '_safeId', '_selectDbCollection', 'get', '_getOneByQuery',
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

  describe('#connexion', () => {
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
        .then(() => {
          should(mainStubbedConnectClient).have.been.called();
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
        retries: 1,
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
          cb('error');
        })
        .onSecondCall().callsFake((url, options, cb) => {
          cb(null, stubbedClient);
        });

      driver = new Driver(yggdrasil, {
        retries: 2,
        retryDelay: 10
      }, null, null, stubbedConnectClient);

      await driver.connect();
      should(stubbedConnectClient).have.been.calledTwice();
    });

    it('should fail if connexion fails too many times', () => {
      stubbedConnectClient = sinon.stub().callsFake((url, options, cb) => {
        cb(new Error('Fake Mongo Error'));
      });

      driver = new Driver(yggdrasil, {
        retries: 1,
        retryDelay: 10
      }, null, null, stubbedConnectClient);

      return driver.connect()
        .then(() => {
          should(true).be.false('False positive');
        })
        .catch(e => {
          should(e).an.instanceOf(Error);
          should(e.message).be.eql('Can\'t connect to Mongo');
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
  });
});