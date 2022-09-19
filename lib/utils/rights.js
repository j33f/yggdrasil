'use strict';

let
  fromString, fromWhatever, merge;

/**
 * Use a string formatted like +RW-X and returns a number representing thise rights based on a dictionary
 * @param {object} dictionary - dictionary of letters and corresponding values
 * @param {string} string - string representing rights
 * @param {number} rights - the original value
 *
 * @return {number} - the computed new value
 */
fromString = (dictionary, string = '') => {
  const array = string.split('');
  let
    add = true,
    rights = 0;

  array.forEach(char => {
    switch (char) {
      case '+':
        add = false;
        break;
      case '-':
        add = true;
        break;
      default:
        if (add) {
          rights = rights | dictionary[char.toUpperCase()];
        } else {
          rights = rights & ~dictionary[char.toUpperCase()];
        }
    }
  });

  return rights;
};

/**
 * Merge two rights representation values depending on the specified mode
 * @param {number} a - the old rights
 * @param {number} b - the rights to apply
 * @param {string} mode - the merging mode to use (inclusive or exclusive)
 *
 * @return {number} the computed new value
 */
merge = (a, b, mode = 'inclusive') => {
  switch(mode) {
    case 'exclusive':
      return a & b;
    case 'inclusive':
      return a | b;
  }
};

/**
 * Use a string formatted like +RW-X and returns a number representing thise rights based on a dictionary
 * @param {object} dictionary - dictionary of letters and corresponding values
 * @param {string} string - string representing rights
 * @param {number} rights - the original value
 *
 * @return {number} - the computed new value
 */
fromWhatever = (dictionary, value) => {

  let
    max = 0,
    letters,
    rights = 0;

  Object.keys(dictionary).forEach(key => {
    max += dictionary[key];
  });

  letters = Object.keys(dictionary).join('');

  if (value.toUpperCase().matchAny(new RegExp('^[' + letters + '+-]*$','i'))) {
    // +A-B format
    rights = fromString(dictionary, value);
  } else if (value.toString(10).match(/^[10]*$/)) {
    // binary format
    rights = parseInt(value, 2);
  } else {
    // literal integer format
    rights = parseInt(value);
  }
  if (rights > max) {
    rights = max;
  }
  return rights;
};

module.exports = {
  fromString: fromString,
  merge: merge,
  fromWhatever: fromWhatever
};
