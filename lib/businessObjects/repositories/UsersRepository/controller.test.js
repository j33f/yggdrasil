'use strict';

const should = require('should');

let controller = require('./controller');

describe('User controller', function() {
  describe('#topology', function() {
    const methods = ['me', 'setClientOption', 'canList', 'list', 'get', 'set', 'create', 'findDupes', 'update', 'getDistinct', 'getPolicies', 'deleteAttachment'];

    methods.forEach(method => {
      it(`should have the "${method}" method`, function() {
        should(typeof controller[method]).be.eql('function');
      });
    });
  });
});
