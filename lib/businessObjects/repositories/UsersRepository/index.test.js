'use strict';

require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
require('should-sinon');
const UsersRepository = require('./index');

let yggdrasil, testRepo, storageService;

describe('Users repository', () => {

  beforeEach(() => {
    storageService = require('@unitTests/mocks/storageService.stub');

    yggdrasil = {
      storageService,
      events: require('@unitTests/mocks/eventsService.stub'),
      config: require('@unitTests/testConfig'),
      lib: require('@unitTests/mocks/lib.stub'),
      socketIOListeners: [],
      repositories: {
        auth: {
          getForUserId: sinon.stub()
        }
      }
    };

    yggdrasil.fire = yggdrasil.events.fire;
    yggdrasil.listen = yggdrasil.events.listen;

    testRepo = new UsersRepository(yggdrasil);
    sinon.reset();
  });

  describe('#configurations and parameters', () => {
    it('should store the index, collection, repository name, yggdrasil and model', () => {
      should(testRepo.index).be.eql('users');
      should(testRepo.collection).be.eql('data');
      should(testRepo.name).be.eql('Users');
      should(testRepo.yggdrasil).be.eql(yggdrasil);
      should(testRepo.model).not.be.undefined();
    });
  });

  describe('#get', () => {
    it('should not call the auth repo getForUserId method and add credentials to the user body when noCredentials is true', async () => {
      storageService.get = sinon.stub().resolves({_id: 'id', body: {_id: 'id', foo: 'bar'}});
      yggdrasil.repositories.auth.getForUserId = sinon.stub().resolves({foo: 'bar'});

      const response = await testRepo.get('id', false, true);
      should(yggdrasil.repositories.auth.getForUserId).have.not.been.called();
      should(response.body.credentials).be.eql(undefined);
    });

    it('should call the auth repo getForUserId method and add credentials to the user body when noCredentials is false', async () => {
      storageService.get = sinon.stub().resolves({_id: 'id', body: {_id: 'id', foo: 'bar'}});
      yggdrasil.repositories.auth.getForUserId = sinon.stub().resolves({foo: 'bar'});

      const response = await testRepo.get('id', false, false);
      should(yggdrasil.repositories.auth.getForUserId).have.been.calledOnce();
      should(response.body.credentials).be.eql({foo: 'bar'});
    });

    it('should resolves with the user if there a re no credentials', async () => {
      storageService.get = sinon.stub().resolves({_id: 'id', body: {_id: 'id', foo: 'bar'}});
      yggdrasil.repositories.auth.getForUserId = sinon.stub().rejects();

      const response = await testRepo.get('id');
      should(yggdrasil.repositories.auth.getForUserId).have.not.been.called();
      should(response.body.auth).be.eql(undefined);
    });
  });

  describe('#set', () => {
    it('should remove credentials before to store', async () => {
      storageService.set = sinon.stub().resolves();

      await testRepo.set({_id: 'id', body: {foo: 'bar', credentials: 'must be removed'}});
      should(storageService.set).have.been.calledWith({
        body: {foo: 'bar'},
        collection: 'data',
        _id: 'id',
        index: 'users'
      });
    });
  });

  describe('#list', () => {
    it('should inject the credentials into the returned list', async () => {
      storageService.list = sinon.stub().resolves({list: [{_id: 'id', foo: 'bar'}]});
      yggdrasil.repositories.auth.getForUserId = sinon.stub().resolves({baz: 'qux'});

      const response = await testRepo.list({foo: 'bar'});
      should(yggdrasil.repositories.auth.getForUserId).have.been.called();
      should(response.list[0].credentials).be.eql({baz: 'qux'});
    });

    it('should leave the list unchanged if no credentials found', async () => {
      storageService.list = sinon.stub().resolves({list: [{_id: 'id', foo: 'bar'}]});
      yggdrasil.repositories.auth.getForUserId = sinon.stub().rejects();

      const response = await testRepo.list({foo: 'bar'});
      should(yggdrasil.repositories.auth.getForUserId).have.been.called();
      should(response.list[0].credentials).be.eql(undefined);
    });
  });
});
