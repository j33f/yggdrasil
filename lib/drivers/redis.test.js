'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
require('should-sinon');

const Driver = require('./redis');
const RewiredDriver = rewire('./redis');

const sandbox = sinon.createSandbox();

let StubbedIORedis, driver, yggdrasil, stubbedConstructor, stubbedConnect, document;

describe('Redis Driver', () => {
  beforeEach(() => {
    yggdrasil = {
      events: require('@unitTests/mocks/eventsService.stub')(sandbox),
      lib: require('@unitTests/mocks/lib.stub')
    };

    yggdrasil.fire = yggdrasil.events.fire;
    yggdrasil.listen = yggdrasil.events.listen;
    yggdrasil.listenOnce = yggdrasil.events.listenOnce;

    stubbedConstructor = sandbox.stub();
    stubbedConnect = sandbox.stub().resolves();

    StubbedIORedis = function (config) {
      stubbedConstructor(config);
    };

    StubbedIORedis.prototype.connect = function() {
      return stubbedConnect();
    };

    driver = new Driver(yggdrasil, {foo: 'bar'}, 2, 10, StubbedIORedis);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#topology', () => {
    const properties = ['yggdrasil', 'config', 'connectionRetries', 'maxRetries', 'client', 'isConnected'];
    const methods = ['connect', 'disconnect', '_keyFromParams', 'get', 'rawGet', 'delete', 'rawDelete', 'set', 'rawDelete', 'setList', 'getList', 'deleteList', 'flush'];

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

  describe('#constructor', () => {
    it('should store the right config', () => {
      driver = new Driver(yggdrasil, {foo: 'bar'}, null, null, StubbedIORedis);
      should(driver.config).be.eql({foo: 'bar', lazyConnect: true});
      should(stubbedConstructor).have.been.calledWith({foo: 'bar', lazyConnect: true});
    });

    it('should use the default IORedis lib if no lib provided', () => {
      RewiredDriver.__set__('TheRedis', StubbedIORedis);
      driver = new RewiredDriver(yggdrasil, {foo: 'bar'});
      should(driver.config).be.eql({foo: 'bar', lazyConnect: true});
      should(stubbedConstructor).have.been.calledWith({foo: 'bar', lazyConnect: true});
    });
  });

  describe('#connect', () => {
    beforeEach(() => {
      driver.client.connect = sandbox.stub().resolves();
    });

    it('should call the connect method from the redis lib', async () => {
      await driver.connect();
      should(driver.client.connect).have.been.called();
      should(driver.isConnected).be.true();
    });

    it('should retry on bad connexion to redis', async () => {
      driver = new Driver(yggdrasil, {foo: 'bar'}, 3, 10, StubbedIORedis);
      driver.client.connect = sandbox.stub().onFirstCall().rejects().onSecondCall().resolves();

      await driver.connect();
      should(driver.client.connect).have.been.calledTwice();
    });

    it('should rejects on bad connexion to redis at maxRetries', () => {
      driver = new Driver(yggdrasil, {foo: 'bar'}, 0, 10, StubbedIORedis);
      driver.client.connect = sandbox.stub().rejects(new Error('a message'));

      return driver.connect()
        .catch(e => {
          let error = new Error('Cant connect to Redis');
          error.redisError = new Error('a message');
          should(e).eqls(error);
        });
    });
  });

  describe('#disconnect', () => {
    it('should call the disconnect method from the redis lib', () => {
      driver.client.disconnect = sandbox.stub().resolves();
      driver.disconnect();
      should(driver.client.disconnect).have.been.called();
      should(yggdrasil.fire).have.been.calledWith('log', 'info', '🔌  Redis is disconnected');
    });
  });

  describe('#_keyFromParams', () => {
    it('should throw when no index is given', async() => {
      await driver._keyFromParams({id: 'foo'})
        .should.be.rejectedWith(Error, {message: 'No index provided'});
    });

    it('should throw when no collection is given', async() => {
      await driver._keyFromParams({index: 'foo'})
        .should.be.rejectedWith(Error, {message: 'No collection provided'});
    });

    it('should throw when no id is given', async() => {
      await driver._keyFromParams({index: 'foo', collection: 'bar'})
        .should.be.rejectedWith(Error, {message: 'No id provided'});
    });

    it('should throw when no query is given', async() => {
      await driver._keyFromParams({index: 'foo', collection: 'bar'}, true)
        .should.be.rejectedWith(Error, {message: 'No query provided or query is not an object'});
    });

    it('should throw when query is given but not an object', async() => {
      await driver._keyFromParams({index: 'foo', collection: 'bar', query: 'qux'}, true)
        .should.be.rejectedWith(Error, {message: 'No query provided or query is not an object'});
    });

    it('should resolve with the right string (with id)', async () => {
      const string = await driver._keyFromParams({index: 'foo', collection: 'bar', id:'baz'});
      should(string).be.eql('foo_bar_baz');
    });

    it('should resolve with the right string (with _id)', async () => {
      const string = await driver._keyFromParams({index: 'foo', collection: 'bar', _id:'baz'});
      should(string).be.eql('foo_bar_baz');
    });

    it('should resolve with the right string (with query)', async () => {
      const string = await driver._keyFromParams({index: 'foo', collection: 'bar', query: {foo: 'bar'}}, true);
      should(string).be.eql('foo_bar_{"foo":"bar"}');
    });

    it('should ignore the id param when noId is set', async () => {
      const string = await driver._keyFromParams({id: 'id', index: 'foo', collection: 'bar', query: {foo: 'bar'}}, true);
      should(string).be.eql('foo_bar_{"foo":"bar"}');
    });
  });

  describe('#get', () => {
    beforeEach(async () => {
      document = {
        index: 'foo',
        collection: 'bar',
        id: 'baz',
        body: {foo: 'bar'}
      };

      driver.client.get = sandbox.stub().resolves(JSON.stringify(document.body));
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.get(document);
      should(driver.client.get).have.been.calledWith('foo_bar_baz');
    });

    it('should return the right document', async () => {
      await driver.get(document).should.resolvedWith(document);
    });

    it('should rejects if the document is not found', async () => {
      driver.client.get = sandbox.stub().resolves(null);

      await driver.get(document).should.be.rejectedWith(Error, {message: 'Not Found'});
    });
  });

  describe('#rawGet', () => {
    beforeEach(async () => {
      document = {
        index: 'foo',
        collection: 'bar',
        id: 'baz',
        body: {foo: 'bar'}
      };

      driver.client.get = sandbox.stub().resolves(JSON.stringify(document.body));
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.rawGet('key');
      should(driver.client.get).have.been.calledWith('cache_key');
    });

    it('should return the right document', async () => {
      await driver.rawGet('key').should.resolvedWith(document.body);
    });

    it('should rejects if the document is not found', async () => {
      driver.client.get = sandbox.stub().resolves(null);

      await driver.rawGet('key').should.be.rejectedWith(Error, {message: 'Not Found'});
    });
  });

  describe('#set', () => {
    beforeEach(async () => {
      document = {
        index: 'foo',
        collection: 'bar',
        _id: 'baz',
        body: {foo: 'bar'}
      };

      driver.client.set = sandbox.stub().resolves('OK');
    });

    it('should rejects if no body provided', async () => {
      await driver.set({})
        .should.rejectedWith(Error, {message: 'No body provided'});
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.set(document);
      should(driver.client.set).have.been.calledWith('foo_bar_baz', JSON.stringify(document.body), 'EX', 30);
    });

    it('should call the redis lib with the right parameters (ttl from options)', async () => {
      await driver.set({...document, options: {ttl: 300}});
      should(driver.client.set).have.been.calledWith('foo_bar_baz', JSON.stringify(document.body), 'EX', 300);
    });

    it('should call the redis lib with the right parameters (ttl from config)', async () => {
      driver.config.ttl = 1000;
      await driver.set(document);
      should(driver.client.set).have.been.calledWith('foo_bar_baz', JSON.stringify(document.body), 'EX', 1000);
    });
  });

  describe('#rawSet', () => {
    beforeEach(async () => {
      document = {
        key: 'foo',
        body: {foo: 'bar'}
      };

      driver.client.set = sandbox.stub().resolves('OK');
    });

    it('should rejects if no key provided', async () => {
      await driver.rawSet({})
        .should.rejectedWith(Error, {message: 'No key provided, or key is not a string'});
    });

    it('should rejects if key is not a string', async () => {
      await driver.rawSet({key: {foo: 'bar'}})
        .should.rejectedWith(Error, {message: 'No key provided, or key is not a string'});
    });

    it('should rejects if no body provided', async () => {
      await driver.rawSet({key:'foo'})
        .should.rejectedWith(Error, {message: 'No body provided'});
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.rawSet(document);
      should(driver.client.set).have.been.calledWith('cache_foo', JSON.stringify(document.body));
    });

    it('should call the redis lib with the right parameters (ttl from options)', async () => {
      await driver.rawSet({...document, options: {ttl: 300}});
      should(driver.client.set).have.been.calledWith('cache_foo', JSON.stringify(document.body), 'EX', 300);
    });
  });

  describe('#delete', () => {
    beforeEach(async () => {
      document = {
        index: 'foo',
        collection: 'bar',
        id: 'baz',
        body: {foo: 'bar'}
      };

      driver.client.del = sandbox.stub().resolves();
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.delete(document);
      should(driver.client.del).have.been.calledWith('foo_bar_baz');
    });
  });

  describe('#rawDelete', () => {
    beforeEach(async () => {
      driver.client.del = sandbox.stub().resolves();
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.rawDelete('foo');
      should(driver.client.del).have.been.calledWith('cache_foo');
    });

    it('should reject if no key provided', async () => {
      await driver.rawDelete()
        .should.rejectedWith(Error, {message: 'No key provided, or key is not a string'});
    });

    it('should reject if key is not a string', async () => {
      await driver.rawDelete({foo: 'bar'})
        .should.rejectedWith(Error, {message: 'No key provided, or key is not a string'});
    });
  });

  describe('#setList', () => {
    beforeEach(async () => {
      document = {
        index: 'foo',
        collection: 'bar',
        query: {foo: 'bar'},
        list: [{foo: 'bar'}]
      };

      driver.client.set = sandbox.stub().resolves('OK');
    });

    it('should rejects if no list provided', async () => {
      await driver.setList({})
        .should.rejectedWith(Error, {message: 'No list provided'});
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.setList(document);
      should(driver.client.set)
        .have.been.calledWith('list_foo_bar_' + JSON.stringify(document.query), JSON.stringify(document.list), 'EX', 2);
    });

    it('should call the redis lib with the right parameters (ttl from options)', async () => {
      await driver.setList({...document, options: {ttl: 300}});
      should(driver.client.set)
        .have.been.calledWith('list_foo_bar_' + JSON.stringify(document.query), JSON.stringify(document.list), 'EX', 300);
    });

    it('should call the redis lib with the right parameters (ttl from config ignored)', async () => {
      driver.config.ttl = 1000;
      await driver.setList(document);
      should(driver.client.set)
        .have.been.calledWith('list_foo_bar_' + JSON.stringify(document.query), JSON.stringify(document.list), 'EX', 2);
    });
  });

  describe('#getList', () => {
    beforeEach(async () => {
      document = {
        index: 'foo',
        collection: 'bar',
        query: {foo: 'bar'},
        list: [{foo: 'bar'}]
      };

      driver.client.get = sandbox.stub().resolves(JSON.stringify(document.list));
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.getList(document);
      should(driver.client.get).have.been.calledWith('list_foo_bar_' + JSON.stringify(document.query));
    });

    it('should return the right document', async () => {
      await driver.getList(document).should.resolvedWith((({index, collection, list}) => ({index, collection, list}))(document));
    });

    it('should rejects if the document is not found', async () => {
      driver.client.get = sandbox.stub().resolves(null);

      await driver.getList(document).should.be.rejectedWith(Error, {message: 'Not Found'});
    });
  });

  describe('#deleteList', () => {
    beforeEach(async () => {
      document = {
        index: 'foo',
        collection: 'bar',
        query: {foo: 'bar'}
      };

      driver.client.del = sandbox.stub().resolves();
    });

    it('should call the redis lib with the right parameters', async () => {
      await driver.deleteList(document);
      should(driver.client.del).have.been.calledWith('list_foo_bar_' + JSON.stringify(document.query));
    });
  });

  describe('#flush', () => {
    beforeEach(async () => {
      driver.client.flushdb = sandbox.stub().resolves();
    });

    it('should call the redis lib', async () => {
      await driver.flush();
      should(driver.client.flushdb).have.been.called();
    });
  });
});