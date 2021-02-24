'use strict';

const apiProviders = [
  //require('./users'),
  require('./utils'),
  require('./files')
];

module.exports = [].concat.apply([], apiProviders);
