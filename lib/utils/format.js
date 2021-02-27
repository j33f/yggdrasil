'use strict';

// In this particular case, moment is the best choice since it deals with a huge amount of different date formats
/* eslint you-dont-need-momentjs/no-require-moment: "off", you-dont-need-momentjs/no-moment-constructor: "off", you-dont-need-momentjs/format: "off" */

const
  moment = require('moment'),
  { castArray } = require('lodash');

moment().local();

/**
 * Takes any kind of phone notation then reformat it using the international notation
 * @param {string} str - the string representing the phone number
 * @return {string|null} - the formatted phone number
 */
const formatPhone = str => {
  const reg = new RegExp('^([+0]|\\(\\d{1,3}\\))? ?(\\(0\\))?[ \\d.\\\\\\/-]{8,18}$','g');
  str = String(str);
  if (String(str).match(reg)) {
    str = str.replace('(0)',''); // removes the (0) in (123) (0)45698745 notation
    str = str.replace(/^\((\d{1,3})\)/, '+$1'); // add a + before the one to three leading non zero digits
    if (str.substring(0, 2) === '00') { // if the two first chars are 00, we have an old international prefix, replace it by +
      return '+' + str.replace(/\D/g, '').slice(2);
    }
    if (str.substring(0, 1) === '+') { // the phone number is already in an intl format like
      return '+' + str.replace(/\D/g, ''); // remove all non digit chars and place a leading +
    }
    return '+33' + str.replace(/\D/g, '').slice(1); // if none of the precedent rules applies, consider it as a french phone number in french format
  }
  return null;
};

/**
 * Check if an email have the right format, trim and lowercase it
 * @param str
 * @returns {*}
 */
const formatEmail = str => {
  // see https://regex101.com/r/4SU2RY/9/tests to test it against several cases accepted by the rfc
  const reg = new RegExp('^[^\\s.@](?:\\.?[^\\s.@]+)*@[^\\s.@](?:\\.?[^\\s.@]+)*$','gu');

  if (str) {
    str = String(str).trim().toLowerCase();
    if (reg.test(str)) {
      return str;
    }
  }
  return null;
};

/**
 * Check if a given string is in the given dictionary, if string is null or undefined, set it to the default value
 * @param str {string}
 * @param _dic {array}
 * @param defaultValue {string}
 * @returns {*}
 */
const oneOf = (str, _dic, defaultValue) => {
  const dic = castArray(_dic);

  if (dic.length === 0 || (dic.length === 1 && dic[0] === undefined)) {
    throw new Error ('A dictionary array must be given.');
  }
  if (str) {
    str = str.trim();
    if (dic.includes(str)) {
      return str;
    }
  }
  if (defaultValue) {
    return defaultValue;
  }
  return null;
};

/**
 * Format a trigram (3 letters uppercase)
 * @param str
 * @returns {*}
 */
const formatTrigram = (str) => {
  if (typeof str === 'string') {
    str = str.toUpperCase();
    if (str.length === 3) {
      return str;
    }
  }
  return null;
};

const dateTime = {
  toUnix: (content) => {
    if (content === null || content === undefined) {
      return null;
    }
    if (moment(content).isValid()) {
      // an unix timestamp have 10 digits at this time, if the given
      // content is already an unix timestamp, moment js will divide it by 1000...
      if (String(moment(content).unix()).length === 10) {
        return moment(content).unix();
      }
      // check if we have a real 10 digits integer which is probably an unix timestamp
      if (Number.isInteger(content) || String(content).length === 10) {
        return parseInt(content);
      }
    } else if (!Number.isNaN(parseInt(content))) {
      // lets try by parsInt the content
      return dateTime.toUnix(parseInt(content));
    }
    return null;
  },
  toDateString: (content, format = 'DD/MM/YYYY') => {
    if (content === null || content === undefined) {
      return null;
    }
    if (moment(content).isValid()) {
      if (Number.isInteger(content) && String(content).length === 10) {
        return moment.unix(parseInt(content)).format(format);
      }
      return moment(content).format(format);
    } else if (typeof content === 'string' && String(content).length === 10) {
      return moment.unix(parseInt(content)).format(format);
    }
    return null;
  }
};

const checkInt = (input, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) => {
  // note isInteger returns false for numbers greater than
  if (Number.isInteger(input)) {
    if ((min && input < min) || (max && input > max)) {
      return null;
    }
    return input;
  }
  return null;
};

/**
 * Returns input string with first letter in upper case and others in lower case. Example: "abcDE" becomes "Abcde" and "jean-françois" become "Jean-François"
 * @param {string} string - string to format
 * @returns {string}
 */
const uppercaseFirstLetter = (string) => {
  const upperFirst = (s) => {
    return s.charAt(0).toUpperCase() + s.substring(1);
  };

  string = string || '';

  string = string.toString().trim() || '';
  string = string.toLowerCase();

  string = string.split(' ').map(s => upperFirst(s.trim())).join(' ');
  string = string.split('-').map(s => upperFirst(s.trim())).join('-');
  return string;
};

module.exports = {
  phone: formatPhone,
  email: formatEmail,
  trigram: formatTrigram,
  oneOf: oneOf,
  dateTime: dateTime,
  checkInt: checkInt,
  uppercaseFirstLetter: uppercaseFirstLetter
};
