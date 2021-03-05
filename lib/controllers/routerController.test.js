'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
require('should-sinon');

const controller = require('./routerController');

let yggdrasil;

describe('Router Controller', () => {
  beforeEach(() => {
    yggdrasil = {
      events: require('@unitTests/mocks/eventsService.stub'),
      lib: require('@unitTests/mocks/lib.stub')
    };

    yggdrasil.fire = yggdrasil.events.fire;
    yggdrasil.listen = yggdrasil.events.listenOnce;
  });
  describe('#topology', () => {
    const properties = ['router'];
    const methods = ['addRouter', 'getRouter'];

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

  describe('#addRouter', () => {
    it('should call router.use', () => {
      sinon.stub(controller.router, 'use').returns();
      controller.addRouter('foo', 'router', 'bar', yggdrasil);
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