'use strict';

module.exports = sandbox => {
  return {
    get: sandbox.stub(),
    set: sandbox.stub(),
    delete: sandbox.stub(),
    search: sandbox.stub(),
    list: sandbox.stub(),
    walk: sandbox.stub(),
    getDistinct: sandbox.stub(),
    cache: sandbox.stub(),
    getCache: sandbox.stub(),
    delCache: sandbox.stub()
  };
};