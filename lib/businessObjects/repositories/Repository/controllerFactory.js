'use strict';

const Bluebird = require('bluebird');

const repoMethods = ['get', 'create', 'update', 'delete', 'list', 'search', 'walk', 'getDistinct'];
const capabilityRequiredFor = {
  get: 'read',
  create: 'create',
  update: 'update',
  delete: 'delete',
  list: 'list',
  search: 'search',
  walk: 'list',
  getDistinct: 'read'
};

const factory = (yggdrasil, repository, methods = []) => {
  let controller = {};
  let _methods = repoMethods.filter(m => !methods.includes(m));
  _methods = [..._methods, ...methods];

  _methods.forEach(method => {
    controller[method] = (_yggdrasil, session, data) => {
      if (!session.user.can(capabilityRequiredFor[method], repository.name.toLowerCase(), data)) {
        const errorMessage = `The user #${session.userId} cannot do ${method} on object type "${repository.name.toLowerCase()}" because of one of its policies: ${JSON.stringify(session.user.data.policies)}`;
        yggdrasil.fire('log', 'warn', errorMessage);
        let error = new Error(errorMessage);
        error.reason = 'FORBIDDEN';
        error.action = method;
        error.requiredCapability = capabilityRequiredFor[method];
        error.objectType = repository.name.toLowerCase();
        error.userPolicies = session.user.data.policies;
        Bluebird.reject(error);
      }
      return repository[method](data)
        .then(result => {
          let status;
          if (result.status) {
            return result;
          }

          switch (method) {
            case 'delete':
              status = 204;
              break;
            case 'create':
              status = 201;
              break;
            default:
              status = 200;
          }
          return {
            status: status,
            response: result
          };
        });
    };
  });

  return controller;
};

module.exports = factory;