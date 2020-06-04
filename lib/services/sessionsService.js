'use strict';

const
  Bluebird = require('bluebird'),
  jwt = require('jsonwebtoken');

class SessionsService {
  constructor(yggdrasil, customJWTLib) {
    this.yggdrasil = yggdrasil;
    this.jwtLib = customJWTLib || jwt; // allow rewire to stub this in unit tests
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
   * Create a JWT and Store it into cache to keep a reconrd on non revoked ones
   * @param payload
   * @returns {Promise<*>}
   */
  async createJWT(payload) {
    let signedJWT;
    payload.jti = this.yggdrasil.uuid(); // JWT id
    payload.iss = this.yggdrasil.config.iss; // issuer identifier (identity of this instance of the yggdrasil

    signedJWT = this.jwtLib.sign(payload, this.yggdrasil.config.JWTSecret, {
      expiresIn: this.yggdrasil.config.sessions.duration
    });

    await this.yggdrasil.storageService.setCache({
      key: this.sessionId(payload.jti, this.yggdrasil.config.iss),
      body: signedJWT,
      options: {
        ttl: this.yggdrasil.config.sessions.durationSeconds
      }
    });

    return signedJWT;
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
   * @param done - callback called when the check is done : last parameter is true when payload is revoques, false otherwise
   */
  isRevoked (req, payload, done) {
    req.yggdrasil.sessionsService.isRevokedPromise(req.yggdrasil, payload)
      .then(() => done(null, false))
      .catch(() => done(null, true));
  }

  /**
   * Same as isrevoked but uses promises (used by socketioJwt and this.isRevokedPromise)
   * @param yggdrasil the current yggdrasil
   * @param payload the given payload to check
   * @returns {Promise|Promise<T | Promise>}
   */
  isRevokedPromise (yggdrasil, payload) {
    if (payload.jti) {
      return yggdrasil.storageService.getCache({
        key: yggdrasil.sessionsService.sessionId(payload.jti, yggdrasil.config.iss)
      })
        .then(resp => {
          if (resp !== '') {
            return Bluebird.resolve(true);
          }
          yggdrasil.logger.warn('Revoked JWT', JSON.stringify(payload));
          return Bluebird.reject(new Error('Revoked JWT'));
        })
        .catch(() => {
          yggdrasil.logger.warn('Revoked JWT', JSON.stringify(payload));
          return Bluebird.reject(new Error('Revoked JWT'));
        });
    }
    yggdrasil.logger.warn('no JTI in JWT', JSON.stringify(payload));
    return Bluebird.reject(new Error('Invalid JWT'));
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
}

module.exports = SessionsService;