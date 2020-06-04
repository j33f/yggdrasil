'use strict';

require('module-alias/register');

const
  chai = require('chai'),
  should = require('should'),
  sinon = require('sinon'),
  sinonChai = require('sinon-chai'),
  UsersRepository = require('./UsersRepository'),
  expect = chai.expect;

chai.use(sinonChai);

let yggdrasil, testRepo, storageService;

describe('Users repository', () => {

  beforeEach(() => {
    storageService = require('@unitTests/mocks/storageService.stub');

    yggdrasil = {
      storageService,
      logger: require('@unitTests/mocks/logger.stub'),
      config: require('@unitTests/testConfig'),
      lib: require('@unitTests/mocks/lib.stub'),
      repositories: {
        credentials: {
          getForUserId: sinon.stub()
        }
      }
    };

    testRepo = new UsersRepository(yggdrasil);
    sinon.reset();
  });

  describe('#configurations and parameters', () => {
    it('should store the index', () => {
      should(testRepo.index).be.eql('users');
    });

    it('should store the collection', () => {
      should(testRepo.collection).be.eql('data');
    });

    it('should store the repository name', () => {
      should(testRepo.name).be.eql('Users');
    });

    it('should store the yggdrasil itself', () => {
      should(testRepo.yggdrasil).be.eql(yggdrasil);
    });

    it('should have a not empty model', () => {
      should(testRepo.model).not.be.undefined();
    });
  });

  describe('#get', () => {
    it('should call the credentials repo getForUserId method and add credentials to the user body', () => {
      storageService.get = sinon.stub().resolves({_id: 'id', body: {_id:'id', foo: 'bar'}});
      yggdrasil.repositories.credentials.getForUserId = sinon.stub().resolves({foo: 'bar'});

      return testRepo.get('id')
        .then(response => {
          expect(yggdrasil.repositories.credentials.getForUserId).to.have.been.calledOnce;
          should(response.body.credentials).be.eql({foo: 'bar'});
        });
    });

    it('should resolves with the user if there a re no credentials', () => {
      storageService.get = sinon.stub().resolves({_id: 'id', body: {_id: 'id', foo: 'bar'}});
      yggdrasil.repositories.credentials.getForUserId = sinon.stub().rejects();

      return testRepo.get('id')
        .then(response => {
          expect(yggdrasil.repositories.credentials.getForUserId).to.have.been.calledOnce;
          should(response.body.credentials).be.eql(undefined);
        });
    });
  });

  describe('#set', () => {
    it('should remove credentials before to store', () => {
      storageService.set = sinon.stub().resolves();

      return testRepo.set({_id: 'id', foo: 'bar', credentials: 'must be removed'}, 'id')
        .then(() => {
          expect(storageService.set).to.have.been.calledWith({ body: { _id: 'id', foo: 'bar' }, collection: 'data', id: 'id', index: 'users' });
        });
    });
  });

  describe('#list', () => {
    it('should inject the credentials into the returned list', () => {
      storageService.list = sinon.stub().resolves({list: [{_id:'id', foo: 'bar'}]});
      yggdrasil.repositories.credentials.getForUserId = sinon.stub().resolves({baz: 'qux'});

      return testRepo.list({foo: 'bar'})
        .then(response => {
          expect(yggdrasil.repositories.credentials.getForUserId).to.have.been.called;
          should(response.list[0].credentials).be.eql({baz: 'qux'});
        });
    });

    it('should leave the list unchanged if no credentials found', () => {
      storageService.list = sinon.stub().resolves({list: [{_id:'id', foo: 'bar'}]});
      yggdrasil.repositories.credentials.getForUserId = sinon.stub().rejects();

      return testRepo.list({foo: 'bar'})
        .then(response => {
          expect(yggdrasil.repositories.credentials.getForUserId).to.have.been.called;
          should(response.list[0].credentials).be.eql(undefined);
        });
    });

  });
});
