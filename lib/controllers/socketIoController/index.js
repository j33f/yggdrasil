'use strict';

const
  Bluebird = require('bluebird'),
  socketioJwt = require('socketio-jwt'),
  coreListeners = require('./core');

class SocketIoController {
  constructor(yggdrasil) {
    this.yggdrasil = yggdrasil;
    this.io = require('socket.io')(yggdrasil.server.serverObject, {
      serveClient: false,
      origins: '*:*'
    });

    // adds the io object to the yggdrasil instance
    yggdrasil.io = this.io;

    this.listeners = coreListeners.concat(yggdrasil.plugins.socketIoRoutes);

    this.io.use(socketioJwt.authorize({
      secret: this.yggdrasil.config.JWTSecret,
      handshake: true
    }));

    /**
     * On Connexion
     */
    this.io.on('connection', socket => {
      /**
       * register the API listeners
       */
      this.listeners.forEach(listener => {
        socket.on(listener.event, (data, cb) => {
          const start = process.hrtime();
          let end = [];
          return this.yggdrasil.sessionsService.isRevokedPromise(this.yggdrasil, socket.decoded_token)
            .then(() => {
              // retrieve the user first
              let user = new this.yggdrasil.lib.models.security.user(this.yggdrasil, socket.decoded_token.user.id);
              return user.get() // get it from database : do not trust the session !
                .then(() => listener.cb(
                  socket,
                  this.yggdrasil,
                  socket.decoded_token,
                  user,
                  data,
                  cb))
                .then(() => {
                  end = process.hrtime(start);
                  // access log
                  this.yggdrasil.logger.info('SIO', listener.event, ': OK', end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms');
                  return Bluebird.resolve(true);
                })
                .catch(e => {
                  // Avoid to invalidate socket on error
                  cb({
                    rejected: true,
                    reason: e.status || 'CALL',
                    message: e.message
                  });
                  end = process.hrtime(start);
                  // access log
                  this.yggdrasil.logger.info('SIO', listener.event, ': ERROR', e.status || 'CALL', e.message, end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms');
                  if (!e.status) {
                    this.yggdrasil.logger.error(e);
                  }
                  return Bluebird.resolve(false);
                });
            })
            .catch(e => {
              // The JWT is invalid for any reason (signature, issuer, invalid session id...)
              end = process.hrtime(start);
              if (e.message === 'Invalid JWT' || e.message === 'Revoked JWT') {
                this.yggdrasil.logger.error('SIO', listener.event, ': Invalid or Revoked JWT', end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms');
                cb({
                  rejected: true,
                  reason: 'JWT',
                  message: 'JWT ERROR : invalid or revoked JWT or server changed signature.'
                });
              } else if(e.reason === 'FORBIDDEN') {
                this.yggdrasil.logger.error('SIO', listener.event, ': FORBIDDEN', end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms');
                this.yggdrasil.logger.error(e);
                cb({
                  rejected: true,
                  reason: e.reason,
                  message: e.message
                });
              } else {
                this.yggdrasil.logger.error('SIO', listener.event, ': Execution Error', end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms');
                this.yggdrasil.logger.error(e);
                cb({
                  rejected: true,
                  reason: 'REQUEST',
                  message: 'Content error'
                });
              }
              return Bluebird.resolve(false);
            });
        });
      });

    });

    this.yggdrasil.logger.info('⚙  SocketIO instantiated with', this.listeners.length, 'listeners.');
  }

  /**
   * Broadcast an event to all the connected clients
   * @param event
   * @param message
   */
  broadcast(event, message = null) {
    this.yggdrasil.logger.info('Event broadcasted by sIO:', event, 'with message:', message);
    this.io.emit(event, message);
  }

}

module.exports = SocketIoController;