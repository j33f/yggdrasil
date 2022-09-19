'use strict';
require('module-alias/register');

const EventsService = require('@lib/services/eventsService');

const events = new EventsService();

module.exports = sandbox => {
  return {
    fire: sandbox.stub().callsFake((...args) => events.fire(...args)),
    listen: sandbox.stub().callsFake((...args) => events.listen(...args)),
    listenOnce: sandbox.stub().callsFake((...args) => events.listenOnce(...args)),
    stopListening: sandbox.stub().callsFake((...args) => events.stopListening(...args))
  };
};