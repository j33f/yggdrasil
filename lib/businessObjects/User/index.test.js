'use strict';

const should = require('should');
const sinon = require('sinon');
const User = require('./');
require('should-sinon');

const sandbox = sinon.createSandbox();

let yggdrasil, stubbedpolicyCan, testUser;

describe('User class', () => {
  beforeEach(() => {
    stubbedpolicyCan = sandbox.stub().returns(true);

    yggdrasil = {
      repositories: {
        users: {}
      },
      policies: {
        get: sandbox.stub().returns({
          can: stubbedpolicyCan
        })
      }
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('#topology', () => {
    const properties = ['yggdrasil', 'data', '_policies', 'policies'];
    const methods = ['_initPolicies', '_init', 'create', 'set', 'createCredentials', 'can'];

    testUser = new User(yggdrasil, 'userID');

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
      yggdrasil.uuid = sandbox.stub().returns('AnUUID');

      testUser = new User(yggdrasil);

      should(testUser.id).eqls('AnUUID');
      should(yggdrasil.uuid).have.been.called();
    });
  });
});