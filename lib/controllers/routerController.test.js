'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
const router = require('express').Router();

const controller = require('./routerController');

let yggdrasil;

describe('Router Controller', () => {
  beforeEach(() => {
    yggdrasil = {logger: {info: sinon.stub()}};
  });
  describe('#topology', () => {
    const properties = ['router'];
    const methods = ['addRoute', 'getRouter'];

    properties.forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(controller).have.ownProperty(prop);
      });
    });

    methods.forEach(method => {
      it(`should have the '${method}' method`, () => {
        should(typeof controller[method]).be.eql('function');
      });
    });
  });

  describe('#addRoute', () => {
    it('should call router.use', () => {
      sinon.stub(controller.router, 'use').returns();
      controller.addRoute('foo', 'router', 'bar', yggdrasil);
      should(controller.router.use).have.been.calledWith('foo', 'router');
    });
  });

  describe('#getRouter', () => {
    it('should returns controller.router', () => {
      controller.router = 'foo';
      should(controller.getRouter()).be.eql('foo');
    });
  });
});