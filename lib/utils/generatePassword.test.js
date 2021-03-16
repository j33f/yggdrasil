'use strict';

const should = require('should');
const generatePassword = require('./generatePassword');

describe('Utils Generate password', () => {
  it('should generate a readable password', () => {
    // escapes are useful here !
    // eslint-disable-next-line no-useless-escape
    const reg = new RegExp('^[A-Z][a-z]*(\.[A-Z][a-z]*){0,2}\.[A-Z][a-z]*[@#$€][1-9][0-9]{2,3}$', 'g');
    let result = generatePassword();
    should(reg.test(result)).be.true();
  });

  it('should generate a random password', () => {
    const result = generatePassword(false);
    const reg = new RegExp('^[A-Z0-9!@#$%^&*()+_\\-=}{[\\]|:;"/?.><,`~]{20}$', 'i');
    should(reg.test(result)).be.true();
  });
});