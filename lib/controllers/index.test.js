'use strict';

const
  should = require('should'),
  controllers = require('.');


describe('Controllers', () => {
  ['mail', 'router', 'socketIo'].forEach(controllerName => {
    it(`should ${controllerName} controller exists`, () => {
      should(controllers).have.ownProperty(controllerName);
    });
  });
});
