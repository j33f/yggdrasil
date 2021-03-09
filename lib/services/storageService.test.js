'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
require('should-sinon');

let stubbedMongo = require('@unitTests/mocks/mongo.stub');
let stubbedRedis = require('@unitTests/mocks/redis.stub');

let Service = require('./storageService');

let service, yggdrasil;

yggdrasil = {
  events: require('@unitTests/mocks/eventsService.stub'),
  lib: require('@unitTests/mocks/lib.stub'),
  uuid: sinon.stub().returns('anUUID'),
  storage: {
    mongo: stubbedMongo,
    redis: stubbedRedis
  }
};

yggdrasil.fire = yggdrasil.events.fire;
yggdrasil.listen = yggdrasil.events.listen;
yggdrasil.listenOnce = yggdrasil.events.listenOnce;

describe('Storage Service', () => {
  before(() => {
    service = new Service(yggdrasil);
  });

  afterEach(() => {
    sinon.resetHistory();
  });

  describe('#topology', () => {
    const properties = ['yggdrasil', 'index', 'collection', 'redis', 'mongo', '_safeId'];
    const methods = ['_formatData', '_setObject', '_checkParameters', 'get', 'delete', 'set', 'list', 'search', 'walk',
      'bulk', 'dropDatabase', 'getDistinct', 'setCache', 'getCache', 'delCache'];

    properties.forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(service).have.ownProperty(prop);
      });
    });

    methods.forEach(method => {
      it(`should have the '${method}' method`, () => {
        should(typeof service[method]).be.eql('function');
      });
    });
  });

  describe('#constructor', () => {
    it('should store the given index and collection', () => {
      const aService = new Service(yggdrasil, 'foo', 'bar');
      should(aService.index).eqls('foo');
      should(aService.collection).eqls('bar');
    });
  });

  describe('#_formatData', () => {
    it('should respond with a default empty document', () => {
      const result = service._formatData();
      should(result).eqls({
        index: null,
        collection: null,
        query: {},
        limit: 0,
        id: undefined
      });
    });

    it('should find a suitable id', () => {
      const testList = [
        {objectId: 'anId'},
        {_id: 'anId'},
        {id: 'anId'},
        {body: {_id: 'anId'}},
        {body: {id: 'anId'}}
      ];

      testList.forEach(document => {
        should(service._formatData(document).id).eqls('anId');
      });
    });

    it('should keep all exotic members', () => {
      const testList = [
        {foo: 'bar'},
        {foo: {bar: 'baz'}}
      ];

      testList.forEach(document => {
        should(service._formatData(document)).match(document);
      });
    });
  });

  describe('#_setObject', () => {
    beforeEach(() => {
      service.mongo.set = sinon.stub().resolves({_id: 'anId', body: {_id: 'anId'}});
    });
    it('should call redis then mongo set', async () => {
      await service._setObject({});
      should(stubbedRedis.set).have.been.calledOnce();
      should(stubbedMongo.set).have.been.calledOnce();
      should(yggdrasil.fire).have.been.calledOnce();
    });
  });

  describe('#_checkParameters', () => {
    it('should complain on empty document', () => {
      const result = service._checkParameters();
      should(result).eqls(new Error('No index provided'));
    });

    it('should not complain on empty document and empty required properties', () => {
      const result = service._checkParameters({}, []);
      should(result).be.true();
    });

    it('should complain about lacking collection', () => {
      const result = service._checkParameters({index: 'anIndex'});
      should(result).eqls(new Error('No collection provided'));
    });

    it('should complain about lacking "element"', () => {
      const result = service._checkParameters({index: 'anIndex'}, ['element']);
      should(result).eqls(new Error('No element provided'));
    });

    it('should returns true if everything is ok', () => {
      const result = service._checkParameters({index: 'anIndex', element: 'value'}, ['element']);
      should(result).be.true();
    });

    it('should complain if string is empty', () => {
      const result = service._checkParameters({index: 'anIndex', element: ''}, ['element']);
      should(result).eqls(new Error('Empty element provided'));
    });

    it('should complain if object is empty', () => {
      const result = service._checkParameters({index: 'anIndex', element: {}}, ['element']);
      should(result).eqls(new Error('Empty element provided'));
    });
  });

  describe('#set', () => {
    beforeEach(() => {
      service = new Service(yggdrasil);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should reject on missing body', () => {
      return service.set({index: 'foo', collection: 'bar'})
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('No body provided'));
        });
    });

    it('should reject on empty body', () => {
      return service.set({index: 'foo', collection: 'bar', body: {}})
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('Empty body provided'));
        });
    });

    it('should not call get if this is a new object', async () => {
      service._setObject = sinon.stub().resolves();
      service.get = sinon.stub().resolves();

      await service.set({index: 'foo', collection: 'bar', body: {foo: 'bar'}});
      should(service._setObject).have.been.calledOnce();
      should(service.get).have.not.been.called();
    });

    it('should call get then _setObject if the id is present and the object exists => merge them', async () => {
      service._setObject = sinon.stub().resolves();
      service.get = sinon.stub().resolves({body: {bar: 'baz', toto: 'tutu'}});

      const document = {index: 'foo', collection: 'bar', body: {_id: 'anId', foo: 'bar', bar: 'qux'}};

      await service.set(document);

      should(service._setObject).have.been.calledOnce();
      should(service._setObject).have.been.calledWith(
        {
          id: 'anId',
          query: {},
          limit: 0,
          index: 'foo',
          collection: 'bar',
          body: {
            _id: 'anId',
            foo: 'bar',
            bar: 'qux',
            toto: 'tutu'
          }
        },
        'update'
      );
      should(service.get).have.been.calledOnce();
      should(service.get).have.been.calledWith({
        index: document.index,
        collection: document.collection,
        id: document.body._id
      });
    });

    it('should call get then _setObject if the id is present and the object exists, asking for replace => replace object', async () => {
      service._setObject = sinon.stub().resolves();
      service.get = sinon.stub().resolves({body: {toto: 'tutu'}});

      const document = {
        index: 'foo',
        collection: 'bar',
        body: {_id: 'anId', foo: 'bar', bar: 'qux'},
        replaceObject: true
      };

      await service.set(document);

      should(service._setObject).have.been.calledOnce();
      should(service._setObject).have.been.calledWith({
        ...document,
        id: document.body._id,
        query: {},
        limit: 0
      }, 'update');
      should(service.get).have.been.calledOnce();
      should(service.get).have.been.calledWith({
        index: document.index,
        collection: document.collection,
        id: document.body._id
      });
    });

    it('should call get then _setObject if the id is present and the object does not exists => create object', async () => {
      service._setObject = sinon.stub().resolves();
      service.get = sinon.stub().rejects(new Error('Not Found'));

      const document = {index: 'foo', collection: 'bar', body: {_id: 'anId', foo: 'bar', bar: 'qux'}};

      await service.set(document);

      should(service._setObject).have.been.calledOnce();
      should(service._setObject).have.been.calledWith({...document, id: document.body._id, query: {}, limit: 0});
      should(service.get).have.been.calledOnce();
      should(service.get).have.been.calledWith({
        index: document.index,
        collection: document.collection,
        id: document.body._id
      });
    });
  });

  describe('#get', () => {
    beforeEach(() => {
      service = new Service(yggdrasil);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should reject on missing id', () => {
      return service.get({index: 'foo', collection: 'bar'})
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('No id provided'));
        });
    });

    it('Should ask redis, and answer with the document in redis', async () => {
      service.redis.get = sinon.stub().resolves({body: {a: 'document'}});

      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        id: 'anId'
      };

      const result = await service.get(document);
      should(service.redis.get).have.been.calledWithMatch(document);
      should(service.mongo.get).not.have.been.called();
      should(result).eqls({body: {a: 'document'}});
    });

    it('Should ask redis, and answer with the document in mongo because not in cache', async () => {
      service.redis.get = sinon.stub().rejects();
      service.mongo.get = sinon.stub().resolves({_id: 'anId', body: {another: 'document from mongo'}});

      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        id: 'anId'
      };

      const result = await service.get(document);
      should(service.redis.get).have.been.calledWithMatch(document);
      should(service.mongo.get).have.been.calledWithMatch(document);
      should(result).eqls({_id: 'anId', body: {another: 'document from mongo'}});
    });

    it('Should ask redis, and answer with the document in mongo if asked for no cache', async () => {
      service.redis.get = sinon.stub().resolves({body: {a: 'document'}});
      service.mongo.get = sinon.stub().resolves({_id: 'anId', body: {another: 'document from mongo'}});

      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        id: 'anId',
      };

      const result = await service.get({...document, noCache: true});
      should(service.redis.get).not.have.been.called();
      should(service.mongo.get).have.been.calledWithMatch(document);
      should(result).eqls({_id: 'anId', body: {another: 'document from mongo'}});
    });

    it('Should ask redis, and answer with the document in mongo if asked for no cache', async () => {
      service.redis.get = sinon.stub().resolves({body: {a: 'document'}});
      service.mongo.get = sinon.stub().resolves({_id: 'anId', body: {another: 'document from mongo'}});

      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        id: 'anId',
      };

      const result = await service.get({...document, noCache: true});
      should(service.redis.get).not.have.been.called();
      should(service.mongo.get).have.been.calledWithMatch(document);
      should(result).eqls({_id: 'anId', body: {another: 'document from mongo'}});
    });
  });

  describe('#delete', () => {
    beforeEach(() => {
      service = new Service(yggdrasil);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should reject on missing id', () => {
      return service.delete({index: 'foo', collection: 'bar'})
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('No id provided'));
        });
    });

    it('Should delete in redis, and delete in mongo', async () => {
      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        id: 'anId',
      };

      await service.delete({...document, noCache: true});
      should(service.redis.delete).have.been.calledWithMatch(document);
      should(service.mongo.delete).have.been.calledWithMatch(document);
    });
  });

  describe('#list', () => {
    beforeEach(() => {
      service = new Service(yggdrasil);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should reject on missing index or collection', () => {
      return service.list()
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('No index provided'));
        });
    });

    it('should call the mongo.list, redis.getList and redis.setList methods with the right parameters (not in cache)', async () => {
      const results = [
        {_id: 'fooId', body: {foo: 'foo'}},
        {_id: 'barId', body: {bar: 'bar'}}
      ];
      const
        document = {
          index: 'anIndex',
          collection: 'aCollection',
          query: {
            a: 'query'
          },
          projection: 'projection'
        };
      const listResult = {...document, list: results};

      service.mongo.list = sinon.stub().resolves(results);
      service.redis.getList = sinon.stub().rejects();
      service.redis.setList = sinon.stub().resolves(listResult);

      const result = await service.list(document);
      should(service.mongo.list).have.been.calledWithMatch({...document, limit: 0, id: undefined});
      should(service.redis.getList).have.been.calledWithMatch({...document, limit: 0, id: undefined});
      should(service.redis.setList).have.been.calledWithMatch(listResult);
      should(result).eqls(listResult);
    });

    it('should call the mongo.list, redis.getList and redis.setList methods with the right parameters (in cache)', async () => {
      const results = [
        {_id: 'fooId', body: {foo: 'foo'}},
        {_id: 'barId', body: {bar: 'bar'}}
      ];
      const
        document = {
          index: 'anIndex',
          collection: 'aCollection',
          query: {
            a: 'query'
          },
          projection: 'projection'
        };
      const listResult = {...document, list: results};

      service.mongo.list = sinon.stub();
      service.redis.getList = sinon.stub().resolves(listResult);
      service.redis.setList = sinon.stub();

      const result = await service.list(document);
      should(service.mongo.list).not.have.been.called();
      should(service.redis.getList).have.been.calledWithMatch({...document, limit: 0, id: undefined});
      should(service.redis.setList).not.have.been.called();
      should(result).eqls(listResult);
    });

    it('should call the mongo.list, redis.getList and redis.setList methods with the right parameters (in cache, ask no cache)', async () => {
      const results = [
        {_id: 'fooId', body: {foo: 'foo'}},
        {_id: 'barId', body: {bar: 'bar'}}
      ];
      const
        document = {
          index: 'anIndex',
          collection: 'aCollection',
          query: {
            a: 'query'
          },
          projection: 'projection'
        };
      const listResult = {...document, list: results};

      service.mongo.list = sinon.stub().resolves(results);
      service.redis.getList = sinon.stub();
      service.redis.setList = sinon.stub().resolves(listResult);

      const result = await service.list({...document, noCache: true});
      should(service.mongo.list).have.been.calledWithMatch({...document, limit: 0, id: undefined});
      should(service.redis.getList).not.have.been.called();
      should(service.redis.setList).have.been.calledWithMatch(listResult);
      should(result).eqls(listResult);
    });
  });

  describe('#search', () => {
    beforeEach(() => {
      service = new Service(yggdrasil);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should reject on missing index or collection', () => {
      return service.search()
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('No index provided'));
        });
    });

    it('should call the service.list method with the right parameters', async () => {

      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        query: {
          a: 'query'
        },
        projection: 'projection'
      };

      const list = [
        {_id: 'fooId', body: {foo: 'foo'}},
        {_id: 'barId', body: {bar: 'bar'}}
      ];
      const listResults = {...document, list: list};
      service.list = sinon.stub().resolves(listResults);

      const result = await service.search(document);
      should(service.list).have.been.calledWithMatch(document);
      should(result).eqls(listResults);
    });

    it('should respond with a body if the list have only one result', async () => {

      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        query: {
          a: 'query'
        },
        projection: 'projection'
      };

      const list = [
        {_id: 'fooId', body: {foo: 'foo'}}
      ];
      const listResults = {...document, list: list};
      service.list = sinon.stub().resolves(listResults);

      const result = await service.search(document);
      should(service.list).have.been.calledWithMatch(document);
      should(result).eqls({...listResults, body: list[0]});
    });

    it('should reject with a not found error if the list is empty', async () => {

      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        query: {
          a: 'query'
        },
        projection: 'projection'
      };

      const list = [];
      const listResults = {...document, list: list};
      service.list = sinon.stub().resolves(listResults);

      try {
        await service.search(document);
        should(true).be.false('False success');
      } catch (e) {
        should(service.list).have.been.calledWithMatch(document);
        should(e).eqls(new Error('Not Found'));
      }
    });
  });

  describe('#walk', () => {
    beforeEach(() => {
      service = new Service(yggdrasil);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should reject on missing index or collection', () => {
      return service.walk()
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('No index provided'));
        });
    });

    it('should call the mongo.walk method with the right parameters', async () => {

      const document = {
        index: 'anIndex',
        collection: 'aCollection',
        query: {
          a: 'query'
        },
        projection: 'projection'
      };

      service.mongo.walk = sinon.stub().resolves({a: 'response'});

      const result = await service.walk(document);
      should(service.mongo.walk).have.been.calledWithMatch(document);
      should(result).eqls({a: 'response'});
    });
  });

  describe('#bulk', () => {
    beforeEach(() => {
      service = new Service(yggdrasil);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should reject on missing index or collection', () => {
      return service.bulk()
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('No index provided'));
        });
    });

    it('should reject if body is not an array', () => {
      return service.bulk({
        index: 'i',
        collection: 'c',
        body: {}
      })
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('You must provide an array as body'));
        });
    });

    it('should resolve if body is an empty array', async () => {
      const result = await service.bulk({
        index: 'i',
        collection: 'c',
        body: []
      });
      should(result).eqls({});
    });

    it('should call the mongo.bulk method, then redis.flush', async () => {
      service.mongo.bulk = sinon.stub().resolves();
      service.redis.flush = sinon.stub().resolves();
      await service.bulk({
        index: 'i',
        collection: 'c',
        body: ['not empty']
      });
      should(service.mongo.bulk).have.been.calledWithMatch({
        index: 'i',
        collection: 'c',
        body: ['not empty']
      });
      should(service.redis.flush).have.been.called();
    });
  });

  describe('#dropDatabase', () => {
    it('should call the mongo.dropDatabase and redis.flush methods', () => {
      service.mongo.dropDatabase = sinon.stub().resolves();
      service.redis.flush = sinon.stub().resolves();
      service.dropDatabase('toto');
      should(service.mongo.dropDatabase).have.been.calledWith('toto');
      should(service.redis.flush).have.been.called();
    });
  });

  describe('#getDistinct', () => {
    beforeEach(() => {
      service = new Service(yggdrasil);
    });

    afterEach(() => {
      sinon.resetHistory();
    });

    it('should reject on missing key', () => {
      return service.getDistinct({
        index: 'i',
        collection: 'c'
      })
        .then(() => {
          should(true).be.false('False success');
        })
        .catch(e => {
          should(e).eqls(new Error('No key provided'));
        });
    });

    it('should call the mongo.getDistinct', async () => {
      service.mongo.getDistinct = sinon.stub().resolves();
      const document = {
        index: 'i',
        collection: 'c',
        key: 'k'
      };
      await service.getDistinct(document);
      should(service.mongo.getDistinct).have.been.calledWithMatch(document);
    });
  });

  describe('#cache management', () => {
    const methods = {
      setCache: 'rawSet',
      getCache: 'rawGet',
      delCache: 'rawDelete'
    };
    Object.keys(methods).forEach(method => {
      it(`${method} should call redis.${methods[method]}`, async () => {
        await service[method]();
        should(service.redis[methods[method]]).have.been.called();
      });
    });
  });
});