'use strict';

const
  should = require('should');

let
  format = require('./format');

describe('Format utils', () => {
  describe('#formatPhone', () => {
    it('should return null when not a correct phone number format', () => {
      should(format.phone('toto')).be.eql(null);
    });

    it('should handle this french phone number with dot format : 01.02.03.04.05', () => {
      should(format.phone('01.02.03.04.05')).be.eql('+33102030405');
    });

    it('should handle this french phone number with dot format : 01-02-03-04-05', () => {
      should(format.phone('01-02-03-04-05')).be.eql('+33102030405');
    });

    it('should handle this french phone number with space format : 01 02 03 04 05', () => {
      should(format.phone('01 02 03 04 05')).be.eql('+33102030405');
    });

    it('should handle this french phone number with international format : +33 102 030 405', () => {
      should(format.phone('+33 102 030 405')).be.eql('+33102030405');
    });

    it('should handle this french phone number with international format : 0033 102 030 405', () => {
      should(format.phone('0033 102 030 405')).be.eql('+33102030405');
    });

    it('should handle this american phone number with international format : +1.888.462.6153', () => {
      should(format.phone('+1.888.462.6153')).be.eql('+18884626153');
    });
    it('should handle this moroccan phone number with alternative international format : (212) (0) 5 12 18 45 46', () => {
      should(format.phone('(212) (0) 5 12 18 45 46')).be.eql('+212512184546');
    });
    it('should handle this moroccan phone number with alternative international format : +212 5 12 18 45 46', () => {
      should(format.phone('+212 5 12 18 45 46')).be.eql('+212512184546');
    });
  });

  describe('#formatEmail', () => {
    const
      badEmails = ['toto..toto@dotdot.com', 'toto@tata@tutu.com', 'toto@tata.', 'toto@.tata.com', 'WTF', 'toto&tata.com', 'toto#tata.com'],
      goodEmails = ['toto@tata.com', 'toto.tata@tutu.com', 'toto@tata.toto.com', 'toto@tata.superlongtld', 'toto@tata-tutu.com', '"toto"@tutu.com', '[toto]-tutu@titi.com', 'toto@toto.co', 'toto@accentué.fr'];

    badEmails.forEach(bad => {
      it('should return null for this bad email address : ' + bad, () => {
        should(format.email(bad)).be.eql(null);
      });
    });

    goodEmails.forEach(good => {
      it('should not return null for this good email address : ' + good, () => {
        should(format.email(good)).not.be.eql(null);
      });
    });
  });

  describe('#oneOf', () => {
    it('should throw an error if no dictionary given', () => {
      should(() => {format.oneOf('bad'); }).throw('A dictionary array must be given.');
    });

    it ('should return null if the given "foo" string is not one of [bar, baz] and no default given', () => {
      should(format.oneOf('foo', ['bar', 'baz'])).be.eql(null);
    });

    it ('should return "toto" if the given "foo" string is not one of [bar, baz] and "toto" is given as default', () => {
      should(format.oneOf('foo', ['bar', 'baz'], 'toto')).be.eql('toto');
    });

    it ('should return null if the given "BAR" string is not one of [bar, baz] and no default given', () => {
      should(format.oneOf('BAR', ['bar', 'baz'])).be.eql(null);
    });

    it ('should return "bar" if the given "bar" string is not one of [bar, baz] even if the default value is set to "toto"', () => {
      should(format.oneOf('bar', ['bar', 'baz'], 'toto')).be.eql('bar');
    });
  });

  describe('#formatTrigram', () => {
    it('should return null if the given payload is an integer', () => {
      should(format.trigram(123)).be.eql(null);
    });

    it('should return null if the given payload is an array', () => {
      should(format.trigram(['a','b','c'])).be.eql(null);
    });

    it('should return null if the given payload is an string containng 2 chars', () => {
      should(format.trigram('ab')).be.eql(null);
    });

    it('should return null if the given payload is an string containng 4 chars', () => {
      should(format.trigram('abcd')).be.eql(null);
    });

    it('should return the uppercased trigram if the payload is a string even in lowercase', () => {
      should(format.trigram('abc')).be.eql('ABC');
    });
  });

  describe('#formatInteger', () => {
    it('should return null when not an integer', () => {
      should(format.checkInt('a', null, null)).be.eql(null);
      should(format.checkInt(false, null, null)).be.eql(null);
      should(format.checkInt('123', null, null)).be.eql(null);
      should(format.checkInt(123.45, null, null)).be.eql(null);
    });

    it('should return number when integer', () => {
      should(format.checkInt(123, null, null)).be.eql(123);
      should(format.checkInt(-123, null, null)).be.eql(-123);
    });

    it('should return number when integer within range and null if out of range', () => {
      should(format.checkInt(123, 100, 200)).be.eql(123);
      should(format.checkInt(-123, -125, null)).be.eql(-123);
      should(format.checkInt(-123, null, 15)).be.eql(-123);
      should(format.checkInt(123, 150, 200)).be.eql(null);
      should(format.checkInt(123, 100, 120)).be.eql(null);
      should(format.checkInt(123456789, 10000, 1000000000)).be.eql(123456789);
    });
  });

  describe('#dateTime', () => {
    it('should accept unix timestamps in integer format and give back the same unix timestamp', () => {
      should(format.dateTime.toUnix(1563385338)).be.eql(1563385338);
    });
    it('should accept ms timestamp in integer format and give back the corresponding unix timestamp', () => {
      should(format.dateTime.toUnix(1563385338000)).be.eql(1563385338);
    });
    it('should accept unix timestamps in string format and give back the same unix timestamp in integer format', () => {
      should(format.dateTime.toUnix('1563385338')).be.eql(1563385338);
    });
    it('should respond null with something unparseable', () => {
      should(format.dateTime.toUnix('foo')).be.eql(null);
    });
    it('should respond null with something null or undefined', () => {
      should(format.dateTime.toUnix(null)).be.eql(null);
      should(format.dateTime.toUnix(undefined)).be.eql(null);
    });
  });
});
