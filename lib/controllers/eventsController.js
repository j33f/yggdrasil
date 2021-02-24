'use strict';

const
  EventEmitter = require('events'),
  {castArray} = require('lodash');

class EventsController extends EventEmitter {
  constructor (yggdrasil) {
    super();
    this.yggdrasil = yggdrasil;

    this.listen = super.on;
    this.listenOnce = super.once;
    this.fire = super.emit;
    this.stopListening = (events) => {
      castArray(events).forEach((event) => {
        super.removeAllListeners(event);
      });
    };

    yggdrasil.listen = this.listen;
    yggdrasil.stopListening = this.stopListening;
    yggdrasil.listenOnce = this.listenOnce;
    yggdrasil.fire = this.fire;
  }
}

module.exports = EventsController;