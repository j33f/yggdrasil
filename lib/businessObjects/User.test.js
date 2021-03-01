'use strict';

const should = require('should');
const sinon = require('sinon');
const User = require('./User');

let
  yggdrasil = {
    repositories: {
      users: {}
    }
  },
  testUser;

describe('User class', () => {

  beforeEach(() => {
    sinon.reset();
  });

  describe('#topology', () => {
    const
      properties = ['yggdrasil', 'data', 'policies', 'id'],
      methods = ['get', 'set', 'havePolicies', 'havePoliciesOnly'];

    testUser = new User(yggdrasil, 'userId');

    properties.forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(testUser).have.ownProperty(prop);
      });
    });

    methods.forEach(method => {
      it(`should have the '${method}' method`, () => {
        should(typeof testUser[method]).be.eql('function');
      });
    });
  });

  describe('#constructor', () => {
    it('should generate an UUID if none given', () => {
      yggdrasil.uuid = sinon.stub().returns('AnUUID');

      testUser = new User(yggdrasil);

      should(testUser.id).eqls('AnUUID');
      should(yggdrasil.uuid).been.called();
    });

    it('should convert an object UUID to a string', () => {
      const id = {
        toHexString: sinon.stub().returns('AnUUIDString')
      };

      testUser = new User(yggdrasil, id);

      should(testUser.id).eqls('AnUUIDString');
      should(id.toHexString).been.called();
    });
  });

  describe('#get', () => {
    it('should get the user from the repository with no given ID', async () => {
      yggdrasil.repositories.users.get = sinon.stub().resolves({id: 'userId', body: { foo: 'bar', policies: ['aPolicy'] } });

      testUser = new User(yggdrasil, 'userId');

      const result = await testUser.get();
      should(result).be.an.instanceof(User);
      should(yggdrasil.repositories.users.get).been.called();
      should(testUser.policies).eqls(['aPolicy']);
      should(testUser.data.foo).eqls('bar');
    });

    it('should get the user from the repository with given string ID', async () => {
      yggdrasil.repositories.users.get = sinon.stub().resolves({id: 'userId', body: { foo: 'bar', policies: ['aPolicy'] } });

      testUser = new User(yggdrasil, 'userId');

      const result = await testUser.get('userID');
      should(result).be.an.instanceof(User);
      should(yggdrasil.repositories.users.get).been.calledWith('userID');
      should(testUser.policies).eqls(['aPolicy']);
      should(testUser.data.foo).eqls('bar');
    });

    it('should get the user from the repository with given object ID', async () => {
      const id = {
        toHexString: sinon.stub().returns('AnUUIDString')
      };

      yggdrasil.repositories.users.get = sinon.stub().resolves({id: 'userId', body: { foo: 'bar', policies: ['aPolicy'] } });

      testUser = new User(yggdrasil, 'userId');

      const result = await testUser.get(id);
      should(result).be.an.instanceof(User);
      should(id.toHexString).been.called();
      should(yggdrasil.repositories.users.get).been.calledWith('AnUUIDString');
      should(testUser.policies).eqls(['aPolicy']);
      should(testUser.data.foo).eqls('bar');
    });

    it('should get the user from the repository and store the id as string even if repository retrieved id is an object', async () => {
      const id = {
        toHexString: sinon.stub().returns('AnUUIDString')
      };

      yggdrasil.repositories.users.get = sinon.stub().resolves({id: id, body: { foo: 'bar', policies: ['aPolicy'] } });

      testUser = new User(yggdrasil, 'userId');

      await testUser.get('AnId');

      should(id.toHexString).been.called();
      should(testUser.id).eqls('AnUUIDString');
    });
  });

  describe('#set', () => {
    it('should get the user from the repository before to set the new data', async () => {
      yggdrasil.repositories.users.get = sinon.stub().resolves({id: 'userId', body: {foo: 'bar', policies: ['aPolicy']}});
      yggdrasil.repositories.users.set = sinon.stub().resolves(true);

      testUser = new User(yggdrasil, 'userId');

      const result = await testUser.set({bar: 'baz', policies: ['aPolicy', 'anotherPolicy']});
      should(result).be.true();
      should(yggdrasil.repositories.users.get).been.called();
      should(yggdrasil.repositories.users.set).been.called();
      should(testUser.policies).eqls(['aPolicy']);
      should(testUser.data.foo).eqls('bar');
      should(testUser.data.bar).eqls('baz');
    });
  });

  describe('#havePolicies', () => {
    it('should return true if user have one of the policies', async () => {
      testUser = new User(yggdrasil, 'userId');

      testUser.policies = ['foo', 'bar', 'qux'];

      const result = testUser.havePolicies(['foo', 'baz']);
      should(result).be.true();
    });

    it('should return false if user do not have this policy', async () => {
      testUser = new User(yggdrasil, 'userId');

      testUser.policies = ['foo', 'bar', 'qux'];

      const result = testUser.havePolicies('baz');
      should(result).be.false();
    });

    it('should return true if user have the root policy', async () => {
      testUser = new User(yggdrasil, 'userId');

      testUser.policies = ['foo', 'bar', 'qux', 'root'];

      const result = testUser.havePolicies('baz');
      should(result).be.true();
    });
  });

  describe('#havePoliciesOnly', () => {
    it('should return true if user have all of the policies', async () => {
      testUser = new User(yggdrasil, 'userId');

      testUser.policies = ['foo', 'bar', 'qux'];

      const result = testUser.havePoliciesOnly(['foo', 'bar', 'qux']);
      should(result).be.true();
    });

    it('should return false if user do not have all these policies', async () => {
      testUser = new User(yggdrasil, 'userId');

      testUser.policies = ['foo', 'bar', 'qux'];

      const result = testUser.havePoliciesOnly(['bar', 'foo', 'baz', 'qux']);
      should(result).be.false();
    });

    it('should return false if user have all these policies and have other', async () => {
      testUser = new User(yggdrasil, 'userId');

      testUser.policies = ['foo', 'bar', 'baz', 'qux'];

      const result = testUser.havePoliciesOnly(['bar', 'foo', 'qux']);
      should(result).be.false();
    });

    it('should return true even if user do not have all these policies because it have the root policy', async () => {
      testUser = new User(yggdrasil, 'userId');

      testUser.policies = ['foo', 'bar', 'qux', 'root'];

      const result = testUser.havePoliciesOnly(['bar', 'foo', 'baz', 'qux'], true);
      should(result).be.true();
    });
  });
});