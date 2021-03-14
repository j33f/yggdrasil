'use strict';

module.exports = sandbox => {
  return {
    get: sandbox.stub().resolves(),
    set: sandbox.stub().resolves(),
    delete: sandbox.stub().resolves(),
    list: sandbox.stub().resolves(),
    walk: sandbox.stub().resolves(),
    getDistinct: sandbox.stub().resolves(),
    bulk: sandbox.stub().resolves(),
    _safeId: sandbox.stub().callsFake(id => id)
  };
};