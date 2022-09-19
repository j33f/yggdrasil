const should = require('should');
const EventEmitter = require('events');

const TestService = require('./eventsService');

const testService = new TestService({});

describe('Events testService', () => {
  describe('#topology', () => {
    const properties = [
      'eventEmitter'
    ];
    const methods = [
      'listen', 'listenOnce', 'stopListening', 'fire'
    ];

    properties.forEach((property) => {
      it(`should have the ${property} method` , () => {
        should(testService).have.ownProperty(property);
      });
    });

    methods.forEach((method) => {
      it(`should have the ${method} method`, () => {
        should(typeof testService[method]).be.eql('function');
      });
    });
  });

  describe('#internal EventEmitter', () => {
    it('should be an EventEmitter', () => {
      should(testService.eventEmitter).be.an.instanceOf(EventEmitter);
    });
  });

  describe('#fire and listen', () => {
    afterEach(() => {
      testService.stopListening('foo');
    });

    it('should fire an event', (done) => {
      testService.listen('foo', message => {
        should(message).be.eql('bar');
        done();
      });
      testService.fire('foo', 'bar');
    });

    it('should listen once', (done) => {
      let counter = 0;

      testService.listenOnce('foo', message => {
        counter++;
        if (counter <= 1) {
          should(message).be.eql('bar');
          done();
        }
        if (counter > 1) {
          should(true).be.false(`Called ${counter} times instead of 1`);
          done();
        }
      });
      testService.fire('foo', 'bar');
      testService.fire('foo', 'baz');
    });

    it('should trigger multiple listeners', (done) => {
      let counter = 0;

      testService.listen('foo', message => {
        counter++;
        if (counter <= 2) {
          should(['bar', 'baz']).containEql(message);
        }
        if (counter > 2) {
          should(true).be.false(`Called listener ${counter} times instead of 2`);
          done();
        }
        if (counter === 2) {
          done();
        }
      });
      testService.fire('foo', 'bar');
      testService.fire('foo', 'baz');
    });
  });

  describe('stopListening', () => {
    it('should accept single string', () => {
      should(testService.stopListening('test')).not.throw();
    });
    it('should accept string array', () => {
      should(testService.stopListening(['foo', 'bar'])).not.throw();
    });
  });
});