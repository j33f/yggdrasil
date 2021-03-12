'use strict';

const expressJWT = require('express-jwt/lib');

async function JWT (yggdrasil) {
  /**
   * Configure Express : JWT
   */
  /** Set the yggdrasil JWT secret **/
  yggdrasil.config.JWTSecret = yggdrasil.config.JWTSecret || '5b0fc0ed78708601f8d3bd495b0fc0ed78708601f8d3bd4a';
  yggdrasil.config.iss = yggdrasil.config.iss || 'Yggdrasil';
  yggdrasil.fire('log', 'info', `🔧  JWTSecret: ${yggdrasil.config.JWTSecret} issuer: ${yggdrasil.config.iss}`);

  yggdrasil.config.unprotectedPath = [
    '/',
    new RegExp('^/api/+$'), // allow api root
    new RegExp('^/api/files/avatar/.*'), // allow 'avatar' type files
    '/socket.io/', // allow socket.io dedicated route
    new RegExp('^/public.*'), // Public static files
    new RegExp('^(\\/api\\/auth\\/(?!(logout)).*)'), // everything but logout
    {
      url: '*',
      method: ['OPTIONS']
    }
  ];

  yggdrasil.config.unprotectedPath = yggdrasil.config.unprotectedPath.concat(yggdrasil.config.api.unprotectedPath);

  // middlewares to handle JWT
  yggdrasil.use(
    expressJWT({
      credentialsRequired: true,
      secret: yggdrasil.config.JWTSecret,
      issuer: yggdrasil.config.iss,
      algorithms: ['HS256'],
      requestProperty: 'session', // the decoded JWT content will be found in req.session
      getToken: yggdrasil.sessionsService.getJWT,
      isRevoked: yggdrasil.sessionsService.isRevoked
    })
      .unless({
        // path allowed to be accessed without authentication
        path: yggdrasil.config.unprotectedPath
      }),
    (err, req, res, next) => {
      if (err instanceof expressJWT.UnauthorizedError) {
        // render the error page
        res
          .status(err.status)
          .json({
            status: err.status,
            ok: false,
            cause: 'JWT',
            message: err.message,
            details: 'There is a problem with the given JWT or no JWT given at all.'
          });
      } else if (err instanceof Error) {
        res
          .status(err.status || 500)
          .json({
            status: err.status || 500,
            ok: false,
            cause: 'Unknown',
            message: err.message,
            details: 'Something went wrong during your request treatment.'
          });
      } else {
        next();
      }
    }
  );

  // inject the user object into the session to avoid to retrieve it each time
  yggdrasil.use(async (req, res, next) => {
    if (req.session && req.session.userId) {
      try {
        req.session.user = new req.yggdrasil.lib.businessObjects.User(yggdrasil, req.session.userId);
        next();
      } catch(e) {
        req.yggdrasil.fire('log', 'warn', `JWT: This user looks to not exist: #${req.session.userId}`);
        console.error(e);
        return res.yggdrasil.sessionsService.revoke(req.session)
          .then(() => {
            return res
              .clearCookie('Authorization')
              .status(401)
              .json({
                status: 401,
                ok: false,
                cause: 'User',
                message: `JWT: This user looks to not exist: #${req.session.userId}`,
                details: 'Even if the JWT you used and the associated session are valid, ' +
                  'the user does not exists thus you can’t access to this resource. ' +
                  'The session have been revoked and can’t be used anymore.'
              });
          });
      }
    }
    next();
  });
}

module.exports = JWT;