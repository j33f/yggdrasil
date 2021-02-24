const
  should = require('should'),
  EventEmitter = require('events');

const Controller = require('./eventsController');

const controller = new Controller({});

describe('Events controller', () => {
  describe('#type', () => {
    it('should be an instance of EventEmitter', () => {
      should(controller).be.an.instanceOf(EventEmitter);
    });
  });

  describe('#topology', () => {
    const properties = [
      'listen',
      'stopListening',
      'fire',
      'listenOnce',
      'yggdrasil'
    ];
    properties.forEach((property) => {
      it(`should have the ${property} method` , () => {
        should(controller).have.ownProperty(property);
      });
    });
    properties.forEach((property) => {
      if (property !== 'yggdrasil') {
        it(`the yggdrasil property should have the ${property} method`, () => {
          should(controller).have.ownProperty(property);
        });
      }
    });
  });
  /* eslint chai-friendly/no-unused-expressions: "off" */
  describe('stopListening', () => {
    it('should accept single string', () => {
      should(controller.stopListening('test')).doesNotThrow;
    });
    it('should accept string array', () => {
      should(controller.stopListening(['foo', 'bar'])).doesNotThrow;
    });
  });
});