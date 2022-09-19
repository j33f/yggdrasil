'use strict';

const {v4: uuid} = require('uuid');

let controller = {};

/**
 * Log in the user
 *  - create a session
 *  - create the JWT
 *  - prepare the response
 * @param yggdrasil
 * @param userId
 * @param sessionInfos
 * @param secure
 * @returns {Promise<{authCookieOptions: {domain: string, httpOnly: boolean, secure: *}, session: {sessionInfos: *, userId: *}, bearer: *}>}
 */
async function doLogin(yggdrasil, userId, sessionInfos, secure) {
  const session = {
    userId,
    sessionInfos
  };

  const bearer = await yggdrasil.sessionsService.createJWT(session);

  // forge the cookies options
  const domain = yggdrasil.server.domain.split('.');
  const rootDomain = '.' + domain[domain.length-2] + '.' + domain[domain.length-1];
  const authCookieOptions = {
    domain: rootDomain.replace('.undefined.',''), // replace undefined for localhost use
    secure: secure,
    httpOnly: false
  };

  if (yggdrasil.socketIoController) {
    yggdrasil.socketIoController.broadcast('login', userId);
  }

  return {
    bearer: bearer,
    authCookieOptions: authCookieOptions,
    session: session
  };
}

/**
 * Login a user with local strategy
 * @param credentials
 * @param yggdrasil
 * @param secure
 * @returns {Promise<{authCookieOptions: {domain: string, httpOnly: boolean, secure: *}, session: {sessionInfos: *, userId: *}, bearer: *}>}
 */
controller.loginLocal = async (credentials, yggdrasil, secure) => {
  try {
    const userId = await yggdrasil.repositories.auth.loginLocal(credentials.username, credentials.password);

    const sessionInfos = {
      uuid: uuid(),
      loginStrategy: 'local'
    };
    return doLogin(yggdrasil, userId, sessionInfos, secure);
  } catch(e) {
    yggdrasil.fire('log', 'warn', 'Auth: bad credentials (local)', credentials.username, credentials.password);
    throw new Error ('Auth: bad credentials (local)');
  }
};

/**
 * Login a user with OAuth strategy
 * @param profile
 * @param yggdrasil
 * @param secure
 * @returns {Promise<{authCookieOptions: {domain: string, httpOnly: boolean, secure: *}, session: {sessionInfos: *, userId: *}, bearer: *}>}
 */
controller.loginOAuth = async (profile, yggdrasil, secure) => {
  try {
    const userId = await yggdrasil.repositories.auth.loginOAuth(profile);
    const sessionInfos = {
      uuid: uuid(),
      loginStrategy: 'OAuth',
      OAuth: {
        provider: profile.provider,
        id: profile.id
      }
    };
    return doLogin(yggdrasil, userId, sessionInfos, secure);
  } catch(e) {
    yggdrasil.fire('log', 'warn', 'Auth: bad credentials (OAuth)', profile);
    throw new Error ('Auth: bad credentials (OAuth)');
  }
};

controller.logout = (yggdrasil, session) => {
  if (yggdrasil.socketIoController) {
    yggdrasil.socketIoController.broadcast('logout/' + session.userId, null);
    yggdrasil.socketIoController.broadcast('logout', session.userId);
  }
  // session can be null if there is no session or JWT expired
  if (session !== null) {
    // delete the session id from cache: it disallow to reuse the JWT.
    return yggdrasil.sessionsService.revoke(session);
  }
};

/**
 * Check if an OAuth profile is already associated with a user
 * @param yggdrasil
 * @param session
 * @param profile
 * @returns {Promise<boolean>}
 */
controller.checkForExistingOAuthProfileForSessionUser = async (yggdrasil, session, profile) => {
  const credentials = await yggdrasil.repositories.auth.getForUserId(session.userId, true);
  let found = false;
  credentials.forEach(cred => {
    if (
      cred.type === 'OAuth' &&
      cred.OAuthData.provider === profile.provider &&
      String(cred.OAuthData.id) === String(profile.id)
    ) {
      found = true;
    }
  });
  return found;
};

/**
 * Check if an OAuth profile is already associated with any user
 * @param yggdrasil
 * @param profile
 * @returns {Promise<boolean>}
 */
controller.checkForExistingOAuthProfile = async (yggdrasil, profile) => {
  try {
    await yggdrasil.repositories.auth.search({
      query: {
        type: 'OAuth',
        'OAuthData.provider': profile.provider,
        'OAuthData.id': String(profile.id)
      }
    });
    return true;
  } catch(e) {
    return false;
  }
};
/**
 * Try to add an OAuth profile to a user found un the currently active session
 * @param req
 * @param res
 * @param session
 * @param profile
 * @returns {Promise<*>}
 */
controller.addProfileToUser = async (req, res, session, profile) => {
  const foundForUser = await controller.checkForExistingOAuthProfileForSessionUser(req.yggdrasil, session, profile);
  const found = await controller.checkForExistingOAuthProfile(req.yggdrasil, profile);

  // the current profile is not in use at all
  if (!found) {
    await req.yggdrasil.repositories.auth.createForUserId(session.userId, profile, 'OAuth');
    if (req.yggdrasil.config.OAuth.redirectUri && req.yggdrasil.config.OAuth.redirectUri.success) {
      return res.redirectUri(req.yggdrasil.config.OAuth.redirectUri.success);
    }
    return res
      .status(201)
      .json({
        status: 201,
        message: 'Created',
        details: 'The profile have been associated. The current user can now use this profile to log in.'
      });
  }

  // the current profile is already in use by the current session user
  if (foundForUser) {
    if (req.yggdrasil.config.OAuth.redirectUri && req.yggdrasil.config.OAuth.redirectUri.success) {
      return res.redirectUri(req.yggdrasil.config.OAuth.redirectUri.success);
    }
    return res
      .status(200)
      .json({
        status: 200,
        message: 'OK',
        details: 'This profile was already associated with the current account. The current account can already use this profile to log in.'
      });
  }

  // the current profile is already in use by another user !
  if (found && !foundForUser) {
    if (req.yggdrasil.config.OAuth.redirectUri && req.yggdrasil.config.OAuth.redirectUri.failure) {
      return res.redirectUri(req.yggdrasil.config.OAuth.redirectUri.failure);
    }
    return res
      .status(409)
      .json({
        status: 409,
        message: 'Conflict',
        details: 'This profile was already associated with another account. Try to log out then log in again with this profile.'
      });
  }
};


module.exports = controller;
