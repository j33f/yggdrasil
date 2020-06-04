'use strict';

const
  EventEmitter = require('events'),
  _ = require('lodash');

class EventsController extends EventEmitter {
  constructor (yggdrasil) {
    super();
    this.yggdrasil = yggdrasil;

    this.listen = super.on;
    this.listenOnce = super.once;
    this.fire = super.emit;

    yggdrasil.listen = this.listen;
    yggdrasil.stopListening = this.stopListening;
    yggdrasil.listenOnce = this.listenOnce;
    yggdrasil.fire = this.fire;
  }

  stopListening (events) {
    _.castArray(events).forEach((event) => {
      super.removeAllListeners(event);
    });
  }
}

module.exports = EventsController;