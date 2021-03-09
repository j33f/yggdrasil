'use strict';

const should = require('should');

const network = require('./network');

describe('Utils network', () => {
  it('sould respond with a numeric port', () => {
    const result = network.normalizePort('1337');
    should(result).eqls(1337);
  });

  it('should respond with a string (named pipe)', () => {
    const result = network.normalizePort('pipe');
    should(result).eqls('pipe');
  });
});