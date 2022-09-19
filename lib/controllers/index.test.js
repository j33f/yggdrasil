'use strict';

const should = require('should');
const controllers = require('.');

describe('Controllers', () => {
  ['mail', 'router', 'socketIo'].forEach(controllerName => {
    it(`should ${controllerName} controller exists`, () => {
      should(controllers).have.ownProperty(controllerName);
    });
  });
});