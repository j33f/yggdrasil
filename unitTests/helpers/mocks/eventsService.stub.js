'use strict';
require('module-alias/register');

const sinon = require('sinon');

const EventsService = require('@lib/services/eventsService');

const events = new EventsService();

module.exports = {
  fire: sinon.stub().callsFake((...args) => events.fire(...args)),
  listen: sinon.stub().callsFake((...args) => events.listen(...args)),
  listenOnce: sinon.stub().callsFake((...args) => events.listenOnce(...args)),
  stopListening: sinon.stub().callsFake((...args) => events.stopListening(...args))
};