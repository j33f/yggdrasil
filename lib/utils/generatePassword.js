'use strict';

const
  lipsum = require('lorem-ipsum'),
  generator = require('generate-password');

/**
 * Generate a random readable strong password
 * @returns {string}
 */
const generateReadablePassword = () => {
  let
    pss = [],
    pssCheck = 0,
    lip = '',
    number,
    special,
    lipsumOptions = {
      count: 1,
      units: 'sentences',
      sentenceLowerBound: 2,
      sentenceUpperBound: 5,
      format: 'plain',
      suffix: ''
    };

  const specialChars = '@#$€';

  const { words } = require('rc')('lipsumWords', {words:[]});

  if (words.length) {
    lipsumOptions.words = words;
  }

  while(pssCheck < 14 || pssCheck > 15) {
    lip = lipsum(lipsumOptions);
    lip = lip.replace('.', '');
    lip = lip.split(' ');
    pss = lip.map(a => {
      return a.charAt(0).toUpperCase() + a.slice(1);
    });
    pssCheck = pss.join('').length;
  }

  number = Math.floor(Math.random() * 10000);
  while (number.toString().includes('1') || number.toString().includes('5') || number.toString().includes('0')) {
    number = Math.floor(Math.random() * 10000);
  }

  special = specialChars.charAt(Math.floor(Math.random() * specialChars.length));

  return shuffleArray(pss).join('.') + special + number;
};

/**
 * Generate fully random strong password
 * @returns {string}
 */
const generateRandomPassword = (length = 12, numbers = true, symbols = true, lowercase = false, uppercase = true, excludeSimilarCharacters = true, strict = true) => {
  return generator.generate({length, numbers, symbols, lowercase, uppercase, excludeSimilarCharacters, strict});
};

/**
 * Just Shuffle an array
 * @param arr
 * @returns {*}
 */
const shuffleArray = arr => {
  return arr
    .map(a => [Math.random(), a])
    .sort((a, b) => a[0] - b[0])
    .map(a => a[1]);
};

const generatePassword = (readable = true) => {
  if (readable) {
    return generateReadablePassword();
  }
  return generateRandomPassword();
};

module.exports = generatePassword;