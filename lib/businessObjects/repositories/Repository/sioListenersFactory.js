'use strict';
const {castArray} = require('lodash');
const controllerFactory = require('./controllerFactory');

const factory = (yggdrasil, repository, userCreatedListeners) => {
  let controller = yggdrasil.lib.controllers[repository.name.toLowerCase()];
  if (!controller) {
    // if there are no controller, create one
    controller = controllerFactory(yggdrasil, repository);
  }

  let controllerMethods = [];

  Object.keys(controller).forEach(m => {
    if (typeof m === 'function' && m.match(/^\w*/)) {
      // add a listener for "public" methods only
      // avoid to create a listener for methods prefixed by _
      controllerMethods.push(m);
    }
  });

  let userCreatedEvents = [];

  castArray(userCreatedListeners).forEach(l => {
    userCreatedEvents.push(l.event);
  });

  let listeners = [];

  controllerMethods.forEach(method => {
    const event = `${repository.name.toLowerCase()}/${method}`;

    if (!userCreatedEvents.includes(event)) {
      const listener = {
        event: event,
        cb: (socket, _yggdrasil, session, data, fn) => {
          return controller[method](_yggdrasil, session, ...data)
            .then(response => {
              if (typeof fn === 'function') {
                fn(response);
              }
            });
        }
      };

      listeners.push(listener);
    }
  });

  return [...listeners, ...userCreatedListeners];
};

module.exports = factory;