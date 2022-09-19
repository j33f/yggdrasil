'use strict';

const Bluebird = require('bluebird');
const jwt = require('jsonwebtoken');
const {v4: uuid} = require('uuid');

class SessionsService {
  /**
   *
   * @param yggdrasil
   * @param customJWTLib - allow you to use a different lib or perform some unit tests
   * @param customUuidGenerator - same
   */
  constructor(yggdrasil, customJWTLib, customUuidGenerator) {
    this.yggdrasil = yggdrasil;
    this.jwtLib = customJWTLib || jwt; // allow rewire to stub this in unit tests
    this.uuid = customUuidGenerator || uuid; // allow to stub this in unit tests
  }

  /**
   * Create a session ID to store a JWT
   * @param jti
   * @param iss
   * @returns {string}
   */
  sessionId(jti, iss) {
    if (!jti || !iss) {
      throw new Error('No jti or iss given');
    }
    return ['session', iss, jti].join(':');
  }

  /**
   * Create a JWT and Store it into cache to keep a record on non revoked ones
   * @param payload
   * @returns {Promise<*>}
   */
  createJWT(payload) {
    payload.jti = this.uuid(); // JWT id
    payload.iss = this.yggdrasil.config.iss; // issuer identifier (identity of this instance of the yggdrasil

    const signedJWT = this.jwtLib.sign(payload, this.yggdrasil.config.JWTSecret, {
      expiresIn: this.yggdrasil.config.sessions.duration
    });

    return this.yggdrasil.storageService.setCache({
      key: this.sessionId(payload.jti, payload.iss),
      body: signedJWT,
      options: {
        ttl: this.yggdrasil.config.sessions.durationSeconds
      }
    })
      .then(() => {
        return signedJWT;
      });
  }

  /**
   * Get JWT from headers, query string or cookies
   * @param req
   * @returns {string|null|*}
   */
  getJWT(req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    }
    if (req.query && req.query.token) {
      return req.query.token;
    }
    if (req.cookies.Authorization && req.cookies.Authorization.split(' ')[0] === 'Bearer') {
      return req.cookies.Authorization.split(' ')[1];
    }
    return null;
  }

  /**
   * Middleware for express-jwt which check if the given payload (decoded JWT) is revoked or not
   * Used by ExpressJWT for REST routes
   * @param req the request from express
   * @param payload, the given payload to check
   * @param done - callback called when the check is done : last parameter is true when payload is revoked, false otherwise
   */
  isRevoked (req, payload, done) {
    // here, we can't use this, we need to use req to retrieve the session service via yggdrasil
    return req.yggdrasil.sessionsService.isRevokedPromise(payload)
      .then(() => {
        done(null, false);
        return false;
      })
      .catch(() => {
        done(null, true);
        return true;
      });
  }

  /**
   * Same as isRevoked but uses promises (used by socketio-jwt and this.isRevoked)
   * @param payload the given payload to check
   * @returns {Promise|Promise<T | Promise>}
   */
  isRevokedPromise (payload) {
    if (!payload.jti) {
      this.yggdrasil.fire('log', 'warn', 'no JTI in JWT', JSON.stringify(payload));
      return Bluebird.reject(new Error('Invalid JWT'));
    }

    return this.yggdrasil.storageService.getCache(this.sessionId(payload.jti, this.yggdrasil.config.iss))
      .then(resp => {
        if(resp) {
          return Bluebird.resolve(false);
        }
        throw new Error('Revoked JWT');
      })
      .catch(() => {
        this.yggdrasil.fire('log', 'warn', 'Revoked JWT', JSON.stringify(payload));
        return Bluebird.reject(new Error('Revoked JWT'));
      });
  }

  /**
   * Decode a signed JWT
   * @param token
   * @param complete
   * @returns {null|{payload, signature, header}}
   */
  decodeJWT(token, complete = false) {
    return this.jwtLib.decode(token, {json: true, complete: complete});
  }

  /**
   * Revoque a JWT by deleting it from the cache
   * @param payload
   * @returns {*}
   */
  revoke(payload) {
    return this.yggdrasil.storageService.delCache({
      key: this.sessionId(payload.jti, this.yggdrasil.config.iss)
    });
  }

  /**
   * Get a session from the request
   * @param request
   * @returns {{payload, signature, header}}
   */
  getSession(request) {
    return this.decodeJWT(this.getJWT(request))
      .then(session => {
        session.user = new this.yggdrasil.lib.businessObjects.User(this.yggdrasil, session.userId);
        return session;
      });
  }
}

module.exports = SessionsService;