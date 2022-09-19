'use strict';

const
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

    this.listeners = coreListeners.concat(yggdrasil.socketIOlisteners);

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
      this.addListeners(socket, this.listeners);
    });

    this.yggdrasil.fire('log', 'info', `🔧  SocketIO instantiated with ${this.listeners.length} listeners.`);
  }

  /**
   * Add listeners to the socket
   * @param socket
   * @param listeners
   */
  addListeners(socket, listeners) {
    listeners.forEach(listener => {
      socket.on(listener.event, async (data, cb) => {
        return this._listenerHandler(socket, listener, data, cb);
      });
    });
  }

  /**
   * Plug the callback to the given listener on the given socket
   *
   * Takes care about the session validation and the user existence
   * @param socket
   * @param listener
   * @param data
   * @param cb
   * @returns {Promise<boolean>}
   * @private
   */
  async _listenerHandler(socket, listener, data, cb) {
    const start = process.hrtime();

    try {
      // check if the current session is still valid
      await this.yggdrasil.sessionsService.isRevokedPromise(socket.decoded_token);
    } catch (e) {
      this._accessErrorHandler(e, process.hrtime(start), listener, cb);
      return false;
    }

    // the session is valid : init a new user object depending on the user declared into the session
    const user = new this.yggdrasil.lib.businessObjects.User(this.yggdrasil, socket.decoded_token.userId);

    try {
      // get the latest information about the user
      const session = {...socket.decoded_token, user};
      // call the listener callback
      listener.cb(
        socket,
        this.yggdrasil,
        session,
        data,
        cb);

      // access log
      const end = process.hrtime(start);
      this.yggdrasil.fire('log', 'socketio', ['SIO', listener.event, ': OK', end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms'].join(' '));
      return true;
    } catch (e) {
      // Avoid to invalidate socket on error
      this._callErrorHandler(e, process.hrtime(start), listener, cb);
      return false;
    }
  }

  /**
   * Handle errors related to session / JWT and SocketIO
   * @param e         the error
   * @param end       the end time
   * @param listener  the listener reference
   * @param cb        the initial callback
   * @private
   */
  _accessErrorHandler(e, end, listener, cb) {
    // The JWT is invalid for any reason (signature, issuer, invalid session id...)
    if (e.message === 'Invalid JWT' || e.message === 'Revoked JWT') {
      this.yggdrasil.fire('log', 'socketio-crit', ['SIO', listener.event, ': Invalid or Revoked JWT', end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms'].join(' '));
      cb({
        rejected: true,
        reason: 'JWT',
        message: 'JWT ERROR : invalid or revoked JWT or server changed signature.'
      });
    } else if (e.reason === 'FORBIDDEN') {
      this.yggdrasil.fire('log', 'socketio-crit', ['SIO', listener.event, ': FORBIDDEN', end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms'].join(' '));
      this.yggdrasil.fire('log', 'error', e);
      cb({
        rejected: true,
        reason: e.reason,
        message: e.message
      });
    } else {
      this.yggdrasil.fire('log', 'socketio-error', ['SIO', listener.event, ': Execution Error', end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms'].join(' '));
      this.yggdrasil.fire('log', 'error', e);
      cb({
        rejected: true,
        reason: 'REQUEST',
        message: 'Content error'
      });
    }
  }

  /**
   * Handle errors related to the code execution
   * @param e         the error
   * @param end       the end time
   * @param listener  the listener reference
   * @param cb        the initial callback
   * @private
   */
  _callErrorHandler(e, end, listener, cb) {
    cb({
      rejected: true,
      reason: e.status || 'CALL',
      message: e.message
    });
    // access log
    this.yggdrasil.fire('log', 'socketio-error', ['SIO', listener.event, ': ERROR', e.status || 'CALL', e.message, end[0] + 's ' + Math.round(end[1] / 1000000) + 'ms'].join(' '));
    if (!e.status) {
      this.yggdrasil.fire('log', 'error', e);
    }
  }

  /**
   * Broadcast an event to all the connected clients
   * @param event
   * @param message
   */
  broadcast(event, message = null) {
    this.yggdrasil.fire('log', 'socketio', ['Event broadcasted:', event, 'with message:', JSON.stringify(message)].join(' '));
    this.io.emit(event, message);
  }
}

module.exports = SocketIoController;