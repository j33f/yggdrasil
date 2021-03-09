'use strict';
const sinon = require('sinon');

module.exports = {
  get: sinon.stub().resolves(),
  set: sinon.stub().resolves(),
  delete: sinon.stub().resolves(),
  list: sinon.stub().resolves(),
  walk: sinon.stub().resolves(),
  getDistinct: sinon.stub().resolves(),
  bulk: sinon.stub().resolves(),
  _safeId: sinon.stub().callsFake(id => id)
};