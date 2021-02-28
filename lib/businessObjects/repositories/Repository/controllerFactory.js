'use strict';

const repoMethods = ['get', 'create', 'update', 'delete', 'list', 'search', 'walk', 'getDistinct'];

const factory = (yggdrasil, repository, methods = []) => {
  let controller = {};
  let _methods = repoMethods.filter(m => !methods.includes(m));
  _methods = [..._methods, ...methods];

  _methods.forEach(method => {
    controller[method] = (yggdrasil, userId, data) => {
      const user = new yggdrasil.lib.models.security.user(yggdrasil, userId);
      user.get();

      return repository[method](data)
        .then(result => {
          let status;
          if (result.status){
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