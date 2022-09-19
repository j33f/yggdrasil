'use strict';

const {EventEmitter} = require('events');
const {castArray} = require('lodash');

class EventsService {
  constructor () {
    this.eventEmitter = new EventEmitter();
  }

  listen(...args) {
    this.eventEmitter.on(...args);
  }

  listenOnce(...args) {
    this.eventEmitter.once(...args);
  }

  fire(...args) {
    this.eventEmitter.emit(...args);
  }

  stopListening(events) {
    castArray(events).forEach((event) => {
      this.eventEmitter.removeAllListeners(event);
    });
  }
}

module.exports = EventsService;