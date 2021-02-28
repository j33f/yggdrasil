'use strict';

const expressJWT = require('express-jwt/lib');

async function JWT (yggdrasil) {
  /**
   * Configure Express : JWT
   */
  /** Set the yggdrasil JWT secret **/
  yggdrasil.config.JWTSecret = yggdrasil.config.JWTSecret || '5b0fc0ed78708601f8d3bd495b0fc0ed78708601f8d3bd4a';
  yggdrasil.config.iss = yggdrasil.config.iss || 'Yggdrasil';
  yggdrasil.logger.info(`🔧  JWTSecret: ${yggdrasil.config.JWTSecret} issuer: ${yggdrasil.config.iss}`);

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
}

module.exports = JWT;