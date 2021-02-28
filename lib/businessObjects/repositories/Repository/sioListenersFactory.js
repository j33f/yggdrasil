'use strict';

const repoMethods = ['get', 'create', 'update', 'delete', 'list', 'search', 'walk', 'getDistinct'];

const factory = (yggdrasil, repository, methods = []) => {
  let listeners = [];
  let _methods = repoMethods.filter(m => !methods.includes(m));
  _methods = [..._methods, ...methods];

  const controller = yggdrasil.lib.controllers[repository.name.toLowerCase()];

  _methods.forEach(method => {
    const listener = {
      event: `${repository.name.toLowerCase()}/${method}`,
      cb: (socket, _yggdrasil, session, user, data, fn) => {
        return controller[method](_yggdrasil, user.id, data)
          .then(response=> {
            if (typeof fn === 'function') {
              fn(response);
            }
          });
      }
    };

    listeners.push(listener);
  });

  return listeners;
};

module.exports = factory;