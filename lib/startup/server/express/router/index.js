'use strict';

const
  staticFiles = require('./staticFiles'),
  API = require('./api'),
  errors = require('./errors');

module.exports = async (yggdrasil) => {
  await staticFiles(yggdrasil);
  await API(yggdrasil);
  await errors(yggdrasil);
};
