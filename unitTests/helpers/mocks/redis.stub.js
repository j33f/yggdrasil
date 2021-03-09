'use strict';
const sinon = require('sinon');

module.exports = {
  get: sinon.stub().resolves(),
  set: sinon.stub().resolves(),
  delete: sinon.stub().resolves(),
  rawGet: sinon.stub().resolves(),
  rawSet: sinon.stub().resolves(),
  rawDelete: sinon.stub().resolves(),
  flush: sinon.stub().resolves()
};