'use strict';
const sinon = require('sinon');

module.exports = {
  info: sinon.stub(),
  log: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  addListener: yggdrasil => {
    yggdrasil.listen('log', (level, ...message) => {
      yggdrasil.logger.log(level, castArray(message).join(' '));
    });
  }

};