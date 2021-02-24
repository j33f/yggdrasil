module.exports = {

  /**
   * Response to send when login is ok
   * @param res
   * @param data - JWT as bearer and cookies options
   * @param isOAuth
   * @returns {*}
   */
  ok: (res, data, isOAuth = false) => {
    if (isOAuth && res.yggdrasil.config.OAuth.redirectUri && res.yggdrasil.config.OAuth.redirectUri.success) {
      return res.redirectUri(res.yggdrasil.config.OAuth.redirectUri.success);
    }
    res
      .cookie('Authorization', 'Bearer ' + data.bearer, data.authCookieOptions)
      .set('Authorization', 'Bearer ' + data.bearer, data.authCookieOptions)
      .status(200)
      .json({
        session: data.session,
        jwt: data.bearer
      });
  },
  /**
   * Response to send when the login is not successful
   * @param res
   * @param isOAuth
   * @returns {*}
   */
  bad: (res, isOAuth = false) => {
    if (isOAuth && res.yggdrasil.config.OAuth.redirectUri && res.yggdrasil.config.OAuth.redirectUri.failure) {
      return res.redirectUri(res.yggdrasil.config.OAuth.redirectUri.failure);
    }

    res
      .status(403)
      .json({
        status: 403,
        message: 'Bad Credentials'
      });
  },
  /**
   * Response to send when accessing to a not implmented or not configured strategy
   * @param res
   * @returns {*|never}
   */
  OAuthNotImplemented: (res) => {
    if (res.yggdrasil.config.OAuth && res.yggdrasil.config.OAuth.redirectUri && res.yggdrasil.config.OAuth.redirectUri.failure) {
      return res.redirectUri(res.yggdrasil.config.OAuth.redirectUri.failure);
    }

    res
      .status(501)
      .json({
        status: 501,
        message: 'Not implemented',
        details: `This OAuth strategy is not implemented yet or not properly configured.`
      });
  }
};