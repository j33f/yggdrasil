'use strict';

let controller = {};

controller.login = async (credentials, yggdrasil, secure) => {
  try {
    const userId = await yggdrasil.repositories.credentials.challenge(credentials.username, credentials.password);
    const user = new yggdrasil.lib.models.security.user(yggdrasil, userId);

    await user.get();

    const session = {
      user: {
        id: user.id,
        data: user.data,
      }
    };

    const bearer = await yggdrasil.sessionsService.createJWT(session);

    const domain = yggdrasil.server.domain.split('.');
    const rootDomain = '.' + domain[domain.length-2] + '.' + domain[domain.length-1];
    const authCookieOptions = {
      domain: rootDomain.replace('.undefined.',''), // replace undefined for localhost use
      secure: secure,
      httpOnly: false
    };

    if (yggdrasil.socketIoController) {
      yggdrasil.socketIoController.broadcast('login',userId);
    }

    return {
      bearer: bearer,
      authCookieOptions: authCookieOptions,
      session: session
    };
  } catch(e) {
    console.error(e);
    yggdrasil.logger.warn('Auth: bad credentials (internal)', credentials.username, credentials.password);
    throw new Error ('Auth: bad credentials (internal)');
  }
};

controller.logout = (yggdrasil, session) => {
  // session can be null if there is no session or JWT expired
  if (session !== null) {
    // delete the session id from cache to unallow to reuse a stored JWT after logout.
    return yggdrasil.sessionsService.revoke(session);
  }
};

module.exports = controller;
