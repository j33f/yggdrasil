'use strict';

module.exports = sandbox => {
  return {
    get: sandbox.stub().resolves(),
    set: sandbox.stub().resolves(),
    delete: sandbox.stub().resolves(),
    rawGet: sandbox.stub().resolves(),
    rawSet: sandbox.stub().resolves(),
    rawDelete: sandbox.stub().resolves(),
    flush: sandbox.stub().resolves()
  };
};