'use strict';

require('module-alias/register');

const
  chai = require('chai'),
  should = require('should'),
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  ObjectID = require('mongodb').ObjectID,
  Repository = require('./Repository'),

  expect = chai.expect;

chai.use(sinonChai);

let yggdrasil, testRepo, storageService;

describe('Repository master class', () => {

  beforeEach(() => {
    storageService = require('@unitTests/mocks/storageService.stub');

    yggdrasil = {
      storageService,
      logger: require('@unitTests/mocks/logger.stub'),
      config: require('@unitTests/testConfig'),
      lib: require('@unitTests/mocks/lib.stub')
    };

    testRepo = new Repository('testRepo', 'testIndex', 'testCollection', yggdrasil);
    sinon.reset();
  });

  describe('#topology', () => {
    const
      properties = ['yggdrasil', 'globalConfig', 'name', 'index', 'collection', 'storage', 'model'],
      methods = ['injectIndexCollection', 'get', 'create', 'update', 'set', 'delete', 'addAttachment', 'list', 'search', 'walk', 'getDistinct', 'cache', 'getCache', 'delCache', 'getModel', 'findDupes', 'checkAndClean'];

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

    it('should store the yggdrasil itself', () => {
      should(testRepo.yggdrasil).be.eql(yggdrasil);
    });
  });

  describe('#get', () => {
    it('should call the storage service with the right parameters (nocache = default)', () => {
      storageService.get = sinon.stub().resolves();

      return testRepo.get('id')
        .then(() => {
          expect(yggdrasil.storageService.get).to.have.been.calledWith({ collection: 'testCollection', id: 'id', index: 'testIndex', nocache: false });
        });
    });

    it('should call the storage service with the right parameters (nocache = true)', () => {
      storageService.get = sinon.stub().resolves();
      return testRepo.get('id', true)
        .then(() => {
          expect(yggdrasil.storageService.get).to.have.been.calledWith({ collection: 'testCollection', id: 'id', index: 'testIndex', nocache: true });
        });
    });
  });

  describe('#set', () => {
    it('should call the storage service with the right parameters', () => {
      const body = {foo: 'bar'};

      storageService.set = sinon.stub().resolves();

      return testRepo.set(body, 'id')
        .then(() => {
          expect(yggdrasil.storageService.set).to.have.been.calledWith({ body: body, id: 'id', index: 'testIndex', collection: 'testCollection' });
        });
    });
  });

  describe('#create', () => {
    it('should call the storage service with the right parameters', () => {
      const body = {foo: 'bar'};

      storageService.set = sinon.stub().resolves();

      return testRepo.create(body)
        .then(() => {
          expect(yggdrasil.storageService.set).to.have.been.calledWith({ body: body, collection: 'testCollection', id: undefined, index: 'testIndex' });
        });
    });

    it('should not call the storage service if check failed', () => {
      testRepo.checkAndClean = sinon.stub().resolves({error: 'an error'});

      return testRepo.create({foo: 'bar'})
        .then(() => {
          expect(yggdrasil.storageService.set).to.not.have.been.called;
        });
    });

    it('should respond with check summary if check failed', () => {
      const
        body = {foo: 'bar'},
        checkResponse = {
          ok: false,
          body: {bar: 'baz'}
        };

      testRepo.checkAndClean = sinon.stub().resolves(checkResponse);

      return testRepo.create(body)
        .then(response => {
          should(response).be.eql(checkResponse);
        });
    });
  });

  describe('#update', () => {
    it('should call the storage service with the right parameters', () => {
      const body = {foo: 'bar'};

      storageService.set = sinon.stub().resolves();

      return testRepo.update(body)
        .then(() => {
          expect(yggdrasil.storageService.set).to.have.been.calledWith({ body: body, collection: 'testCollection', id: undefined, index: 'testIndex' });
        });
    });

    it('should not call the storage service if check failed', () => {
      const body = {foo: 'bar'};

      testRepo.checkAndClean = sinon.stub().resolves({ok: false});

      return testRepo.update(body)
        .then(() => {
          expect(yggdrasil.storageService.set).to.not.have.been.called;
        });
    });

    it('should respond with check summary if check failed', () => {
      const
        body = {foo: 'bar'},
        checkResponse = {
          ok: false,
          body: {bar: 'baz'}
        };

      testRepo.checkAndClean = sinon.stub().resolves(checkResponse);

      return testRepo.update(body)
        .then(response => {
          should(response).be.eql(checkResponse);
        });
    });
  });

  describe('#delete', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.delete = sinon.stub().resolves();

      return testRepo.delete('id')
        .then(() => {
          expect(yggdrasil.storageService.delete).to.have.been.calledWith({ id: 'id', index: 'testIndex', collection: 'testCollection' });
        });
    });
  });

  describe('#addAttachment', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.get = sinon.stub().resolves({
        body: { documents: ['attachmentId'], id: 'id' },
        collection: 'testCollection',
        index: 'testIndex'
      });
      storageService.set = sinon.stub().resolves();
      testRepo.checkAndClean = sinon.stub().resolves({ok: true, body: {id: 'id', documents: ['attachmentId']}});

      return testRepo.addAttachment('id', {objectId: 'id', attachmentId: 'attachmentId'})
        .then(() => {
          expect(yggdrasil.storageService.get).to.have.been.calledWith({
            collection: 'testCollection',
            id: 'id',
            index: 'testIndex',
            nocache: false
          });

          expect(yggdrasil.storageService.set).to.have.been.calledWith({
            body: { documents: ['attachmentId'], id: 'id' },
            collection: 'testCollection',
            index: 'testIndex',
            id: undefined
          });

        });
    });
  });

  describe('#list', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.list = sinon.stub().resolves();

      return testRepo.list({query: { foo: 'bar'}})
        .then(() => {
          expect(yggdrasil.storageService.list).to.have.been.calledWith({ collection: 'testCollection', index: 'testIndex', query: { foo: 'bar'} });
        });
    });
  });

  describe('#search', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.search = sinon.stub().resolves();

      return testRepo.search({query: { foo: 'bar'}})
        .then(() => {
          expect(yggdrasil.storageService.search).to.have.been.calledWith({ collection: 'testCollection', index: 'testIndex', query: { foo: 'bar'} });
        });
    });
  });

  describe('#walk', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.walk = sinon.stub().resolves();

      return testRepo.walk({query: { foo: 'bar'}})
        .then(() => {
          expect(yggdrasil.storageService.walk).to.have.been.calledWith({ collection: 'testCollection', index: 'testIndex', query: { foo: 'bar'} });
        });
    });
  });

  describe('#getDistinct', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.getDistinct = sinon.stub().resolves();

      return testRepo.getDistinct({query: { foo: 'bar'}})
        .then(() => {
          expect(yggdrasil.storageService.getDistinct).to.have.been.calledWith({ collection: 'testCollection', index: 'testIndex', query: { foo: 'bar'} });
        });
    });
  });

  describe('#cache', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.cache = sinon.stub().resolves();

      return testRepo.cache({query: { foo: 'bar'}})
        .then(() => {
          expect(yggdrasil.storageService.cache).to.have.been.calledWith({query: { foo: 'bar'} });
        });
    });
  });

  describe('#cache', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.cache = sinon.stub().resolves();

      return testRepo.cache({query: { foo: 'bar'}})
        .then(() => {
          expect(yggdrasil.storageService.cache).to.have.been.calledWith({query: { foo: 'bar'} });
        });
    });
  });

  describe('#getCache', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.getCache = sinon.stub().resolves();

      return testRepo.getCache({query: { foo: 'bar'}})
        .then(() => {
          expect(yggdrasil.storageService.getCache).to.have.been.calledWith({query: { foo: 'bar'} });
        });
    });
  });

  describe('#delCache', () => {
    it('should call the storage service with the right parameters', () => {
      storageService.delCache = sinon.stub().resolves();

      return testRepo.delCache({query: { foo: 'bar'}})
        .then(() => {
          expect(yggdrasil.storageService.delCache).to.have.been.calledWith({query: { foo: 'bar'} });
        });
    });
  });

  describe('#getModel', () => {
    it('should respond with an empty object if no model provided (default)', () => {
      return testRepo.getModel()
        .then(response => {
          should(response).be.eql({});
        });
    });

    it('should respond with the model object if any have been set', () => {
      const model = {foo: 'bar'};

      testRepo.model = model;

      return testRepo.getModel()
        .then(response => {
          should(response).be.eql(model);
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
      testRepo.list = sinon.stub().resolves({list: ['bar']});

      return testRepo.findDupes('foo', ['bar'])
        .then(() => {
          expect(testRepo.list).to.have.been.calledWith({
            query: {
              $or : [{
                bar: new RegExp('^foo$', 'i')
              }]
            }
          });
        });
    });

    it('should escape special chars in the search string', () => {
      testRepo.list = sinon.stub().resolves({list: [{bar: 'foo'}]});

      return testRepo.findDupes('foo.*+?^${}()|[]\\', ['bar'])
        .then(() => {
          expect(testRepo.list).to.have.been.calledWith({
            query: {
              $or : [{
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
              body: {foo: 'bar'}
            });
          });
      });

      it('should resolve with an untouched object and no error if there is an empty model', () => {
        testRepo.model = {};

        return testRepo.checkAndClean({foo: 'bar'})
          .then(response => {
            should(response).be.eql({
              ok: true,
              body: {foo: 'bar'}
            });
          });
      });

      it('should create default requiredIfCreatedVia into model if needed', () => {
        testRepo.model = {required: ['foo']};

        return testRepo.checkAndClean({foo: 'bar'})
          .then(() => {
            should(testRepo.model).be.eql({
              required: ['foo'],
              requiredIfCreatedVia: {
                default: ['foo']
              }
            });
          });
      });

      it('should add default entry in requiredIfCreatedVia into model if needed', () => {
        testRepo.model = {
          required: ['foo'],
          requiredIfCreatedVia: {
            bar: ['baz']
          }
        };

        return testRepo.checkAndClean({foo: 'bar'})
          .then(() => {
            should(testRepo.model).be.eql({
              required: ['foo'],
              requiredIfCreatedVia: {
                default: ['foo'],
                bar: ['baz']
              }
            });
          });
      });

      it('should merge default entry of requiredIfCreatedVia with the required one into model if needed', () => {
        testRepo.model = {
          required: ['foo'],
          requiredIfCreatedVia: {
            default: ['baz']
          }
        };

        return testRepo.checkAndClean({foo: 'bar', baz: 'qux'})
          .then(() => {
            should(testRepo.model).be.eql({
              required: ['foo'],
              requiredIfCreatedVia: {
                default: ['baz', 'foo']
              }
            });
          });
      });

      it('should answer with errors if a required entry is not present if created by default', () => {
        testRepo.model = {
          required: ['foo'],
          requiredIfCreatedVia: {
            default: ['baz']
          }
        };

        return testRepo.checkAndClean({qux: 'quux'})
          .then(response => {
            should(response).be.eql({
              errors: {
                baz: {
                  message: 'baz is required because created via default, but not set',
                  key: 'baz',
                  type: 'required'
                },
                foo: {
                  message: 'foo is required because created via default, but not set',
                  key: 'foo',
                  type: 'required'
                }
              }
            });
          });
      });

      it('should not answer with errors if a required entry when created via default is not present if not created via default', () => {
        testRepo.model = {
          required: ['foo'],
          requiredIfCreatedVia: {
            default: ['baz']
          }
        };

        return testRepo.checkAndClean({qux: 'quux', createdVia: 'corge'})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should answer with errors if a required entry when created via "not default" is not present if created via "not default"', () => {
        testRepo.model = {
          required: ['foo'],
          requiredIfCreatedVia: {
            'not default': ['baz']
          }
        };

        return testRepo.checkAndClean({qux: 'quux', createdVia: 'not default'})
          .then(response => {
            should(response).be.eql({
              errors: {
                baz: {
                  message: 'baz is required because created via not default, but not set',
                  key: 'baz',
                  type: 'required'
                }
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

      it('should not respond with an error if a requiredIf consition is met', () => {
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

      it('should respond with an error if a required if consition is met', () => {
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
            expect(yggdrasil.logger.warn).to.have.been.calledOnce;
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
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: 'foo.bar must be a valid email baz have been given.',
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
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: 'foo.bar must be a valid phone number baz have been given.',
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
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: 'foo.bar must be a valid trigram corge have been given.',
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
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: 'foo.bar must be one of ["toto","tutu","tata"] baz have been given.',
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
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: 'foo.bar must be a valid date representation baz have been given.',
                  type: 'dateTime'
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
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: 'foo.bar must be a valid date representation baz have been given.',
                  type: 'dateTime'
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
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: 'foo.bar must be an integer within min value 1 and max value 42 and baz have been given.',
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
              errors: {
                'foo.bar': {
                  key: 'foo.bar',
                  message: 'foo.bar must be an integer within min value 1 and max value 42 and 1337 have been given.',
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
    });

    describe('#uniqueness', () => {
      it('should respond with no error if the field is unique', () => {
        testRepo.list = sinon.stub().resolves({list: []});

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
        testRepo.list = sinon.stub().resolves({list: [{_id: id}]});

        testRepo.model = {
          mustBeUnique: ['foo.bar']
        };

        return testRepo.checkAndClean({_id: id, foo: {bar: 'baz'}})
          .then(response => {
            should(response.ok).be.true();
          });
      });

      it('should respond with an error if the field is not unique ', () =>{

        const id = new ObjectID();
        testRepo.list = sinon.stub().resolves({list: [{_id: id}]});

        testRepo.model = {
          mustBeUnique: ['foo.bar']
        };

        return testRepo.checkAndClean({_id: 'anid', foo: {bar: 'baz'}})
          .then(response => {
            should(response).be.eql({
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
