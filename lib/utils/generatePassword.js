'use strict';

const {loremIpsum} = require('lorem-ipsum');
const generator = require('generate-password');

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

  while(pssCheck < 14 || pssCheck > 15) { // do this to have 15 chars
    lip = loremIpsum(lipsumOptions); // generate a sentense
    lip = lip.replace('.', ''); // avoid to have final points
    lip = lip.split(' '); // create an array from words
    pss = lip.map(a => { // uppercase first letter of each word
      return a.charAt(0).toUpperCase() + a.slice(1);
    });
    pssCheck = pss.join('').length;
  }

  // generate a random number between 100 and 9999
  number = Math.floor(Math.random() * 10000);
  // avoid to have numbers similar to letters for less confusion
  while (number.toString().includes('1') || number.toString().includes('5') || number.toString().includes('0') || number < 100) {
    number = Math.floor(Math.random() * 10000);
  }

  // choose a special char
  special = specialChars.charAt(Math.floor(Math.random() * specialChars.length));

  // shuffle the words and assemble the password parts
  // Generated password should be like Lorem.Ipsum#123 which are easy to remember and strong at the same time
  return shuffleArray(pss).join('.') + special + number;
};

/**
 * Generate fully random strong password
 * @returns {string}
 */
const generateRandomPassword = () => {
  const options = {
    length: 20, numbers: true, symbols: true, lowercase: true, uppercase: true, excludeSimilarCharacters: true, strict: true
  };
  return generator.generate(options);
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