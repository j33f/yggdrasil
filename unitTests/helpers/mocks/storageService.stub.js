'use strict';
const sinon = require('sinon');

module.exports = {
  get: sinon.stub(),
  set: sinon.stub(),
  delete: sinon.stub(),
  search: sinon.stub(),
  list: sinon.stub(),
  walk: sinon.stub(),
  getDistinct: sinon.stub(),
  cache: sinon.stub(),
  getCache: sinon.stub(),
  delCache: sinon.stub()
};