'use strict';

const
  chai = require('chai'),
  expect = chai.expect;

chai.use(require('sinon-chai'));
chai.use(require('chai-as-promised'));

let controller = require('./controller');

describe('User controller', function() {
  describe('#topology', function() {
    const methods = ['me', 'setClientOption', 'canList', 'list', 'get', 'set', 'create', 'findDupes', 'update', 'getDistinct', 'getPolicies', 'deleteAttachment'];

    methods.forEach(methodName => {
      it(`should have the "${methodName}" method`, function() {
        expect(controller).to.have.ownProperty(methodName);
      });
    });
  });
});
