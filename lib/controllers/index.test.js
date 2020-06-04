'use strict';

const
  should = require('should'),
  controllers = require('.');


describe('Controllers', () => {
  it('should find 7 controllers', () => {
    should(controllers).have.size(7);
  });

  ['auth', 'events', 'files', 'mail', 'router', 'socketIo', 'users'].forEach(controllerName => {
    it(`should ${controllerName} controller exists`, () => {
      should(controllers).have.ownProperty(controllerName);
    });
  });
});
