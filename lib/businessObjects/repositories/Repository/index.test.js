'use strict';

require('module-alias/register');

const sinon = require('sinon');
const should = require('should');
const ObjectID = require('mongodb').ObjectID;
const Repository = require('./index');
require('should-sinon');

const sandbox = sinon.createSandbox();

let yggdrasil, testRepo, storageService, now;

describe('Repository master class', () => {

  beforeEach(() => {
    storageService = require('@unitTests/mocks/storageService.stub');

    yggdrasil = {
      storageService,
      socketIOListeners: [],
      logger: require('@unitTests/mocks/logger.stub')(sandbox),
      events: require('@unitTests/mocks/eventsService.stub')(sandbox),
      config: require('@unitTests/testConfig'),
      lib: require('@unitTests/mocks/lib.stub'),
      uuid: sandbox.stub().callsFake(returnString => {
        if (returnString) {
          return 'AnUUID';
        }
        return {toHexString: () => {return 'AnUUID';}};
      })
    };

    yggdrasil.fire = yggdrasil.events.fire;
    yggdrasil.listen = yggdrasil.events.listen;
    yggdrasil.listenOnce = yggdrasil.events.listenOnce;

    testRepo = new Repository('testRepo', 'testIndex', 'testCollection', yggdrasil);
    sandbox.resetHistory();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#topology', () => {
    const
      properties = ['yggdrasil', 'globalConfig', 'name', 'index', 'collection', 'storage', '_model', 'router', 'socketIOListeners', 'eventListeners', 'controller', 'storage'],
      methods = ['registerSocketIOListeners', 'registerHTTPRoutes', '_setIndexCollection', '_injectIndexCollection', 'get', 'create', 'update', 'set', 'delete', 'addAttachment', 'list', 'search', 'walk', 'getDistinct', 'cache', 'getCache', 'delCache', 'findDupes', 'checkAndClean'];

    properties.forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(testRepo).have.ownProperty(prop);
      });
    });

    methods.forEach(method => {
      it(`should have the '${method}' method`, () => {
        should(typeof testRepo[method]).be.eql('function');
      });
    });
  });

  describe('#configurations and parameters', () => {
    it('should store the yggdrasil config', () => {
      should(testRepo.globalConfig).be.eql(yggdrasil.config);
    });

    it('should store the index', () => {
      should(testRepo.index).be.eql('testIndex');
    });

    it('should store the collection', () => {
      should(testRepo.collection).be.eql('testCollection');
    });

    it('should store the repository name', () => {
      should(testRepo.name).be.eql('testRepo');
    });

    it('should store the yggdrasil object itself', () => {
      should(testRepo.yggdrasil).be.eql(yggdrasil);
    });
  });

  describe('#setIndexCollection', () => {
    it('should change the index and collection', () => {
      testRepo._setIndexCollection('foo', 'bar');
      should(testRepo.index).be.eql('foo');
      should(testRepo.collection).be.eql('bar');
    });
    it('should change the index and not the collection', () => {
      testRepo._setIndexCollection('foo');
      should(testRepo.index).be.eql('foo');
      should(testRepo.collection).be.eql('testCollection');
    });
    it('should change the collection and not the index', () => {
      testRepo._setIndexCollection(null, 'foo');
      should(testRepo.index).be.eql('testIndex');
      should(testRepo.collection).be.eql('foo');
    });
  });

  describe('#get', () => {
    it('should call the storage service with the right parameters (noCache = default)', () => {
      storageService.get = sandbox.stub().resolves();

      return testRepo.get('id')
        .then(() => {
          should(yggdrasil.storageService.get).have.been.calledWith({
            collection: 'testCollection',
            _id: 'id',
            index: 'testIndex',
            noCache: false
          });
        });
    });

    it('should call the storage service with the right parameters (noCache = true)', () => {
      storageService.get = sandbox.stub().resolves();
      return testRepo.get('id', true)
        .then(() => {
          should(yggdrasil.storageService.get).have.been.calledWith({
            collection: 'testCollection',
            _id: 'id',
            index: 'testIndex',
            noCache: true
          });
        });
    });
  });

  describe('#set', () => {
    it('should call the storage service with the right parameters', () => {
      const document = {foo: 'bar'};

      storageService.set = sandbox.stub().resolves();

      return testRepo.set(document)
        .then(() => {
          should(yggdrasil.storageService.set).have.been.calledWith({
            ...document,
            index: 'testIndex',
            collection: 'testCollection'
          });
        });
    });
  });

  describe('#create', () => {
    it('should call the storage service with the right parameters', () => {
      const body = {foo: 'bar'};
      const userId = '123';

      storageService.set = sandbox.stub().resolves();

      return testRepo.create(body, userId)
        .then(() => {
          should(yggdrasil.storageService.set).have.been.calledWith({
            body: body,
            meta: {
              createdAt: Date.now() / 1000 | 0,
              createdBy: userId,
              updatedAt: Date.now() / 1000 | 0,
              updateBy: userId
            },
            collection: 'testCollection',
            _id: 'AnUUID',
            index: 'testIndex',
          });
        });
    });

    it('should not call the storage service if check failed', () => {
      yggdrasil.storageService.set.resetHistory();
      testRepo.checkAndClean = sandbox.stub().resolves({errors: 'an error'});

      return testRepo.create({foo: 'bar'})
        .catch(e => {
          let err = new Error('Requirements not met according to the model.');
          err.errors = 'an error';
          should(e).eqls(err);
          should(yggdrasil.storageService.set).have.not.been.called();
        });
    });

    it('should respond with check summary if check failed', () => {
      const
        body = {foo: 'bar'},
        checkResponse = {
          ok: false,
          errors: {bar: 'baz'}
        };

      testRepo.checkAndClean = sandbox.stub().resolves(checkResponse);

      return testRepo.create(body)
        .catch(e => {
          let err = new Error('Requirements not met according to the model.');
          err.errors = checkResponse.errors;
          should(e).eqls(err);
        });
    });
  });

  describe('#update', () => {
    it('should call the storage service with the right parameters', () => {
      const body = {foo: 'bar'};
      const userId = '123';

      storageService.set = sandbox.stub().resolves();

      return testRepo.update({body}, userId)
        .then(() => {
          should(yggdrasil.storageService.set).have.been.calledWith({
            body: body,
            meta: {
              createdAt: Date.now() / 1000 | 0,
              createdBy: userId,
              updatedAt: Date.now() / 1000 | 0,
              updateBy: userId
            },
            collection: 'testCollection',
            _id: undefined,
            index: 'testIndex'
          });
        });
    });

    it('should not call the storage service if check failed', () => {
      yggdrasil.storageService.set.resetHistory();

      const body = {foo: 'bar'};

      testRepo.checkAndClean = sandbox.stub().resolves({ok: false, errors: {some: 'error'}});

      return testRepo.update(body)
        .catch(e => {
          let err = new Error('Requirements not met according to the model.');
          err.errors = {some: 'error'};
          should(e).eqls(err);
          should(yggdrasil.storageService.set).have.not.been.called();
        });
    });

    it('should respond with check summary if check failed', () => {
      const
        body = {foo: 'bar'},
        checkResponse = {
          ok: false,
          errors: {bar: 'baz'}
        };

      testRepo.checkAndClean = sandbox.stub().resolves(checkResponse);

      return testRepo.update(body)
        .catch(e => {
          let err = new Error('Requirements not met according to the model.');
          err.errors = checkResponse.errors;
          should(e).eqls(err);
          should(yggdrasil.storageService.set).have.not.been.called();
        });
    });
  });

  describe('#delete', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.delete = sandbox.stub().resolves();

      return testRepo.delete('id')
        .then(() => {
          should(yggdrasil.storageService.delete).have.been.calledWith({
            _id: 'id',
            index: 'testIndex',
            collection: 'testCollection'
          });
        });
    });
  });

  describe('#addAttachment', () => {
    it('should call the storage service with the right parameters with only one attachment', () => {
      const document = {
        _id: 'id',
        body: {
          attachments: ['anAttachmentId']
        },
        collection: 'testCollection',
        index: 'testIndex'
      };
      storageService.get = sandbox.stub().resolves(document);
      storageService.set = sandbox.stub().resolves();
      testRepo.checkAndClean = sandbox.stub().resolves({ok: true, body: document.body});
      yggdrasil.storageService = storageService;

      return testRepo.addAttachment('id', {objectId: 'id', attachmentId: 'attachmentId'})
        .then(() => {
          should(yggdrasil.storageService.get).have.been.calledWith({
            collection: 'testCollection',
            _id: 'id',
            index: 'testIndex',
            noCache: false
          });

          should(yggdrasil.storageService.set).have.been.calledWith({
            body: {attachments: ['anAttachmentId', 'attachmentId']},
            meta: {
              createdAt: Date.now() / 1000 | 0,
              createdBy: null,
              updatedAt: Date.now() / 1000 | 0,
              updateBy: null
            },
            collection: 'testCollection',
            index: 'testIndex',
            _id: 'id'
          });
        });
    });

    it('should call the storage service with the right parameters with an array of attachments', () => {
      storageService.get = sandbox.stub().resolves({
        _id: 'id',
        body: {documents: ['anAttachmentId']},
        collection: 'testCollection',
        index: 'testIndex'
      });
      storageService.set = sandbox.stub().resolves();
      testRepo.checkAndClean = sandbox.stub().resolves({ok: true, body: {documents: ['anAttachmentId', 'attachmentId']}});

      return testRepo.addAttachment('id', {objectId: 'id', attachmentIds: ['attachmentId']})
        .then(() => {
          should(yggdrasil.storageService.get).have.been.calledWith({
            collection: 'testCollection',
            _id: 'id',
            index: 'testIndex',
            noCache: false
          });

          should(yggdrasil.storageService.set).have.been.calledWith({
            body: {documents: ['anAttachmentId', 'attachmentId']},
            meta: {
              createdAt: Date.now() / 1000 | 0,
              createdBy: null,
              updatedAt: Date.now() / 1000 | 0,
              updateBy: null
            },
            collection: 'testCollection',
            index: 'testIndex',
            _id: 'id'
          });

        });
    });
  });

  describe('#list', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.list = sandbox.stub().resolves();

      return testRepo.list({query: {foo: 'bar'}})
        .then(() => {
          should(yggdrasil.storageService.list).have.been.calledWith({
            collection: 'testCollection',
            index: 'testIndex',
            query: {foo: 'bar'}
          });
        });
    });
  });

  describe('#search', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.search = sandbox.stub().resolves();

      return testRepo.search({query: {foo: 'bar'}})
        .then(() => {
          should(yggdrasil.storageService.search).have.been.calledWith({
            collection: 'testCollection',
            index: 'testIndex',
            query: {foo: 'bar'}
          });
        });
    });
  });

  describe('#walk', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.walk = sandbox.stub().resolves();

      return testRepo.walk({query: {foo: 'bar'}})
        .then(() => {
          should(yggdrasil.storageService.walk).have.been.calledWith({
            collection: 'testCollection',
            index: 'testIndex',
            query: {foo: 'bar'}
          });
        });
    });
  });

  describe('#getDistinct', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.getDistinct = sandbox.stub().resolves();

      return testRepo.getDistinct({query: {foo: 'bar'}})
        .then(() => {
          should(yggdrasil.storageService.getDistinct).have.been.calledWith({
            collection: 'testCollection',
            index: 'testIndex',
            query: {foo: 'bar'}
          });
        });
    });
  });

  describe('#cache', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.cache = sandbox.stub().resolves();

      return testRepo.cache({query: {foo: 'bar'}})
        .then(() => {
          should(yggdrasil.storageService.cache).have.been.calledWith({query: {foo: 'bar'}});
        });
    });
  });

  describe('#getCache', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.getCache = sandbox.stub().resolves();

      return testRepo.getCache({query: {foo: 'bar'}})
        .then(() => {
          should(yggdrasil.storageService.getCache).have.been.calledWith({query: {foo: 'bar'}});
        });
    });
  });

  describe('#delCache', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.delCache = sandbox.stub().resolves();

      return testRepo.delCache({query: {foo: 'bar'}})
        .then(() => {
          should(yggdrasil.storageService.delCache).have.been.calledWith({query: {foo: 'bar'}});
        });
    });
  });

  describe('#findDupes', () => {
    it('should respond with {list:[]} if the "what" parameter is equal to null', () => {
      return testRepo.findDupes(null, [])
        .then(response => {
          should(response).be.eql({list: []});
        });
    });

    it('should call list with the right payload', () => {
      testRepo.list = sandbox.stub().resolves({list: ['bar']});

      return testRepo.findDupes('foo', ['bar'])
        .then(() => {
          should(testRepo.list).have.been.calledWith({
            query: {
              $or: [{
                bar: new RegExp('^foo$', 'i')
              }]
            }
          });
        });
    });

    it('should escape special chars in the search string', () => {
      testRepo.list = sandbox.stub().resolves({list: [{bar: 'foo'}]});

      return testRepo.findDupes('foo.*+?^${}()|[]\\', ['bar'])
        .then(() => {
          should(testRepo.list).have.been.calledWith({
            query: {
              $or: [{
                bar: new RegExp('^foo' + '.*+?^${}()|[]\\'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
              }]
            }
          });
        });
    });
  });

  describe('#checkAndClean', () => {

    describe('#general behavior', () => {
      it('should resolve with an untouched object and no error if there is no model', () => {
        return testRepo.checkAndClean({foo: 'bar'})
          .then(response => {
            should(response).be.eql({
              ok: true,
              body: {
                foo: 'bar'
              }
            });
          });
      });

      it('should resolve with an untouched object and no error if there is an empty model', () => {
        testRepo.model = {};

        return testRepo.checkAndClean({foo: 'bar'})
          .then(response => {
            should(response).be.eql({
              ok: true,
              body: {
                foo: 'bar'
              }
            });
          });
      });

      it('should answer with errors if a required entry by policy "a policy" is not present', () => {
        testRepo.model = {
          requiredIfPolicy: {
            foo: ['a policy'],
            bar: ['another policy']
          }
        };

        return testRepo.checkAndClean({bar: 'foo', baz: 'qux', policies: ['a policy']})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                foo: {
                  message: 'foo is required due to policy a policy but not set',
                  key: 'foo',
                  type: 'policy',
                  policy: 'a policy'
                }
              }
            });
          });
      });

      it('should not answer with errors if a required entry by policy "a policy" is not present and user have not this policy', () => {
        testRepo.model = {
          requiredIfPolicy: {
            foo: ['a policy'],
            bar: ['another policy']
          }
        };

        return testRepo.checkAndClean({bar: 'foo', baz: 'qux', policies: ['another policy']})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if a requiredIf condition is met', () => {
        testRepo.model = {
          requiredIf: [{
            path: 'foo',
            conditions: [
              {
                operand: 'bar',
                operation: 'oneOf',
                oneOf: ['baz', 'qux', 'quux', 'corge', 'grault', 'garply', 'waldo', 'fred', 'plugh', 'xyzzy', 'thud']
              }
            ]
          }]
        };

        return testRepo.checkAndClean({foo: 'bar', bar: 'qux'})
          .then(response => {
            should(response.ok).be.true();
          });

      });

      it('should respond with an error if a requiredIf condition is not met', () => {
        testRepo.model = {
          requiredIf: [{
            path: 'foo',
            conditions: [
              {
                operand: 'bar',
                operation: 'oneOf',
                oneOf: ['baz', 'qux', 'quux', 'corge', 'grault', 'garply', 'waldo', 'fred', 'plugh', 'xyzzy', 'thud']
              }
            ]
          }]
        };

        return testRepo.checkAndClean({bar: 'corge'})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                foo: {
                  message: 'foo must be set when bar is one of ["baz","qux","quux","corge","grault","garply","waldo","fred","plugh","xyzzy","thud"]. "corge" have been given.',
                  key: 'foo',
                  type: 'required'
                }
              }
            });
          });
      });

      it('should not respond with an error if a requiredIf condition operation is not supported ', () => {
        testRepo.model = {
          requiredIf: [{
            path: 'foo',
            conditions: [
              {
                operand: 'bar',
                operation: 'unsupported',
                unsupported: ['baz', 'qux', 'quux', 'corge', 'grault', 'garply', 'waldo', 'fred', 'plugh', 'xyzzy', 'thud']
              }
            ]
          }]
        };

        return testRepo.checkAndClean({bar: 'qux'})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if a requiredIf condition operation is missing ', () => {
        testRepo.model = {
          requiredIf: [{
            path: 'foo',
            conditions: [
              {
                operand: 'bar',
                unsupported: ['baz', 'qux', 'quux', 'corge', 'grault', 'garply', 'waldo', 'fred', 'plugh', 'xyzzy', 'thud']
              }
            ]
          }]
        };

        return testRepo.checkAndClean({bar: 'qux'})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if a requiredIf condition operand is missing ', () => {
        testRepo.model = {
          requiredIf: [{
            path: 'foo',
            conditions: [
              {
                operation: 'bar',
                bar: ['baz', 'qux', 'quux', 'corge', 'grault', 'garply', 'waldo', 'fred', 'plugh', 'xyzzy', 'thud']
              }
            ]
          }]
        };

        return testRepo.checkAndClean({bar: 'qux'})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if a requiredIf condition not met', () => {
        testRepo.model = {
          requiredIf: [{
            path: 'foo',
            conditions: [
              {
                operand: 'bar',
                operation: 'oneOf',
                oneOf: ['baz', 'qux', 'quux', 'corge', 'grault', 'garply', 'waldo', 'fred', 'plugh', 'xyzzy', 'thud']
              }
            ]
          }]
        };

        return testRepo.checkAndClean({bar: 'Obi-Wan Kenobi'})
          .then(response => {
            should(response.ok).be.true();
          });
      });

    });

    describe('#checks on formats', () => {
      it('should not respond with an error for an unknown type check and log a warning', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'baz'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should respond with an error if an email is invalid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'email'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: '"foo.bar" must be a valid "email" but "baz" have been given.',
                  type: 'email'
                }
              }
            });
          });
      });

      it('should respond with an error if a phone is invalid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'phone'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: '"foo.bar" must be a valid "phone number" but "baz" have been given.',
                  type: 'phone'
                }
              }
            });
          });
      });

      it('should respond with an error if a trigram is invalid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'trigram'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'corge'}})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: '"foo.bar" must be a valid "trigram" but "corge" have been given.',
                  type: 'trigram'
                }
              }
            });
          });
      });

      it('should respond with an error if an oneof is invalid and no default value given', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'oneOf',
              oneOf: ['toto', 'tutu', 'tata']
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: '"foo.bar" must be one of ["toto","tutu","tata"] but "baz" have been given.',
                  type: 'oneOf'
                }
              }
            });
          });
      });

      it('should respond with an error if an date is invalid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'date'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: '"foo.bar" must be a valid "date" but "baz" have been given.',
                  type: 'date'
                }
              }
            });
          });
      });

      it('should respond with an error if an time is invalid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'time'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: '"foo.bar" must be a valid "time" but "baz" have been given.',
                  type: 'time'
                }
              }
            });
          });
      });

      it('should respond with an error if an int is invalid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'int',
              minValue: '1',
              maxValue: '42'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: '"foo.bar" must be a valid integer within 1 and 42 but "baz" have been given.',
                  type: 'int'
                }
              }
            });
          });
      });

      it('should respond with an error if an int is out of range', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'int',
              minValue: '1',
              maxValue: '42'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 1337}})
          .then(response => {
            should(response).be.eql({
              ok: false,
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: '"foo.bar" must be a valid integer within 1 and 42 but "1337" have been given.',
                  type: 'int'
                }
              }
            });
          });
      });

      it('should not respond with an error if an email is valid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'email'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz@qux.quux'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if a phone is valid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'phone'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: '0102030405'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if a trigram is valid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'trigram'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'BAZ'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if an oneof is invalid when a default value is given', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'oneOf',
              oneOf: ['toto', 'tutu', 'tata'],
              defaultValue: 'foobar'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if an oneof is valid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'oneOf',
              oneOf: ['toto', 'tutu', 'tata'],
              defaultValue: 'foobar'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 'toto'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if an date is valid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'date'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 0}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not respond with an error if an time is valid', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'time'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 0}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should not add another error if an time is valid', async () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'time'
            }
          ]
        };

        const response = await testRepo.checkAndClean({foo: {bar: 0}}, true, {'foo.bar': 'error'});
        should(response.errors).be.eql({'foo.bar': 'error'});
      });

      it('should not respond with an error if an int is valid and into the range', () => {
        testRepo.model = {
          formats: [
            {
              path: 'foo.bar',
              type: 'int',
              minValue: '1',
              maxValue: '42'
            }
          ]
        };

        return testRepo.checkAndClean({foo: {bar: 13}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      ['email', 'phone', 'trigram', 'oneOf', 'date', 'time', 'int'].forEach(type => {
        it(`should respond with no error if the path is not found (${type})`, async () => {
          testRepo.model = {
            formats: [
              {
                path: 'foo.baz',
                type: type,
                oneOf: ['toto', 'tutu']
              }
            ]
          };

          const response = await testRepo.checkAndClean({foo: {bar: 'baz'}});
          should(response.ok).be.true();
        });
      });

    });

    describe('#uniqueness', () => {
      it('should respond with no error if the field does not exist', () => {
        testRepo.list = sandbox.stub().resolves({list: []});

        testRepo.model = {
          mustBeUnique: ['foo.bar']
        };

        return testRepo.checkAndClean({})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should respond with no error if the field is unique', () => {
        testRepo.list = sandbox.stub().resolves({list: []});

        testRepo.model = {
          mustBeUnique: ['foo.bar']
        };

        return testRepo.checkAndClean({foo: {bar: 'baz'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should respond with no error if updating an object', () => {
        const id = 'anId';
        testRepo.list = sandbox.stub().resolves({list: [{_id: id}]});

        testRepo.model = {
          mustBeUnique: ['foo.bar']
        };

        return testRepo.checkAndClean({_id: id, foo: {bar: 'baz'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should respond with an error if the field is not unique', async () => {
        const id = new ObjectID();
        testRepo.list = sandbox.stub().resolves({list: [{_id: id}]});

        testRepo.model = {
          mustBeUnique: ['foo.bar']
        };

        const response = await testRepo.checkAndClean({_id: 'anid', foo: {bar: 'baz'}});
        should(response).be.eql({
          ok: false,
          errors: {
            'foo.bar': {
              key: 'foo.bar',
              message: 'foo.bar must be unique. baz is already used.',
              type: 'unique'
            }
          }
        });
      });
    });

    describe('#format if policy', () => {
      it('should the formatIfPolicy content during format checks aPolicy is listed in object', () => {
        testRepo.model = {
          formats: [],
          formatsIfPolicy: {
            'aPolicy': [
              {
                path: 'foo.bar',
                type: 'trigram'
              }
            ]
          }
        };

        return testRepo.checkAndClean({policies: ['aPolicy'], foo: {bar: 'ABC'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });
    });
  });
});
