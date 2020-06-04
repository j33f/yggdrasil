'use strict';

module.exports = {
  auth: require('./authController'),
  events: require('./eventsController'),
  files: require('./filesController'),
  mail: require('./mailController'),
  router: require('./routerController'),
  socketIo: require('./socketIoController'),
  users: require('./usersController')
};