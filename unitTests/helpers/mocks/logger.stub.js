'use strict';

module.exports = sandbox => {
  return {
    info: sandbox.stub(),
    log: sandbox.stub(),
    warn: sandbox.stub(),
    error: sandbox.stub(),
    addListener: yggdrasil => {
      yggdrasil.listen('log', (level, ...message) => {
        yggdrasil.logger.log(level, castArray(message).join(' '));
      });
    }
  };
};