'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');

const Driver = require('./mongo');

let driver, yggdrasil, stubbedConstructor, document, list;
