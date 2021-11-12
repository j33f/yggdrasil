'use strict';

const should = require('should');
const sinon = require('sinon');
const User = require('./');
require('should-sinon');

const sandbox = sinon.createSandbox();

let yggdrasil, stubbedPolicyCan, fakeUser, user;

describe('User class', () => {
  beforeEach(() => {
    fakeUser = {
      _id: 'anUUID',
      body: {
        policies: ['anonymous']
      },
      meta: {}
    };

    stubbedPolicyCan = sandbox.stub().returns(true);

    yggdrasil = {
      repositories: {
        users: {
          get: sandbox.stub().resolves(fakeUser)
        }
      },
      policies: {
        get: sandbox.stub().returns({
          can: stubbedPolicyCan
        })
      },
      uuid: sandbox.stub().returns('UUID')
    };

    user = new User(yggdrasil, fakeUser);

    console.log('BE', yggdrasil);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#topology', async () => {
    const properties = ['yggdrasil', 'data', '_policies', 'policies'];
    const methods = ['_initPolicies', '_initPolicies', 'create', 'set', 'createCredentials', 'can'];

    properties.forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(user).have.ownProperty(prop);
      });
    });

    methods.forEach(method => {
      it(`should have the '${method}' method`, () => {
        should(typeof user[method]).be.eql('function');
      });
    });
  });

  describe('#constructor', () => {
    it('should generate an UUID if none given', async () => {
      yggdrasil.uuid = sandbox.stub().returns('AnUUID');

      const testUser = await User.build(yggdrasil);

      should(testUser.id).eqls('AnUUID');
      should(yggdrasil.uuid).have.been.called();
    });
  });
});