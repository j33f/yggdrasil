'use strict';

const msal = require('@azure/msal-node');
const request = require('axios');

/**
 * Since there is no PassportJS strategy suitable for the absolutely messy M$ so called OAuth service,
 * we are here constrained to use their shitty lib called "MSAL" instead of a regular strategy
 */
class MicrosoftStrategy  {
  constructor(yggdrasil) {
    if (!yggdrasil.config.OAuth || !yggdrasil.config.OAuth.Microsoft) {
      yggdrasil.logger.warn('The Microsoft OAuth strategy lacks of configuration information !');
      yggdrasil.logger.warn('Please put them into the .yggdrasilrc file as', '{ \n' +
        '      "OAuth": {\n' +
        '        "Microsoft": {\n' +
        '          "clientId": "YOUR CLIENT ID HERE",\n' +
        '          "clientSecret": "YOUR CLIENT SECRET HERE"\n' +
        '        }\n' +
        '      }\n' +
        '    })');

    } else {
      this.yggdrasil = yggdrasil;
      this.name = 'Microsoft';

      this.scopes = ['user.read', 'profile', 'user.readbasic.all', 'openid'];

      // configure the "things" that makes calls to the M$ API
      this.config = {
        auth: {
          clientId: yggdrasil.config.OAuth.Microsoft.clientId,
          authority: 'https://login.microsoftonline.com/common', // dont change it
          clientSecret: yggdrasil.config.OAuth.Microsoft.clientSecret
        },
        system: {
          loggerOptions: {
            /**
             * Here is the mandatory callback if you (dont) want to see the huuuuuuge amount of logs this crap produces
             * @param loglevel
             * @param message
             * @param containsPii
             */
            loggerCallback(loglevel, message, containsPii) {
              switch (loglevel) {
                case msal.LogLevel.Error:
                  yggdrasil.logger.error(message);
                  break;
                case msal.LogLevel.Warning:
                  yggdrasil.logger.warn(message);
                  break;
              }
            },
            piiLoggingEnabled: false, // turn to true if you wanna see some personnal data into your logs... lol !
            logLevel: msal.LogLevel.Warning,
          }
        }
      };
    }
  }
  init() {
    this.rootURL = this.rootURL || `${this.yggdrasil.server.protocol}://${this.yggdrasil.server.domain}:${this.yggdrasil.server.port}/api/auth/login/${this.name.toLowerCase()}`;
    // yeah I know... they have some serious problems about naming things... btw : it just work
    this.pca = new msal.ConfidentialClientApplication(this.config);

    this.authCodeUrlParameters = {
      scopes: this.scopes,
      redirectUri: this.rootURL + '/callback' // we've already set it when creating the app during the incredibly complex process
    };
    this.initialized = true;
  }

  /**
   * Mimic the passport authenticate method
   *
   * This method is usually called 2 times :
   *  - the first time by the /api/auth/login/microsoft route to be redirected to the M$ server
   *  - the second time by the /api/auth/login/microsoft/callback route to get the user profile back
   *
   *  When the first call is made, the cb (callback function) is not set.
   *  The cb param is set only at the second call
   *
   * @param req
   * @param res
   * @param cb
   * @returns {Promise<void|never|Response>}
   */
  async authenticate(req, res, cb) {
    if (!cb) {
      // first call : get redirected to M$ servers
      try {
        const redirectURL = await this.pca.getAuthCodeUrl(this.authCodeUrlParameters);
        return res.redirect(redirectURL);
      } catch(error) {
        res
          .status(500)
          .json({
            status: 500,
            message: 'Internal Server Error'
          });
        this.yggdrasil.logger.error('MSAUTH - get redirect url', error);
        throw error;
      }
    }

    // second call :
    const tokenRequest = {
      code: req.query.code,
      scopes: this.scopes,
      redirectUri: this.rootURL + '/callback' // why is this required again ????
    };

    let tokenResponse = {};

    try {
      tokenResponse = await this.pca.acquireTokenByCode(tokenRequest);
    } catch (e) {
      this.yggdrasil.logger.error('MSAUTH2', e);
      cb(null);
      throw error;
    }
    try {
      const profile = await request({
        method: 'GET',
        url: 'https://graph.microsoft.com/v1.0/me',
        headers: {'Authorization': `Bearer ${tokenResponse.accessToken}`}
      });
      profile.data.provider = 'microsoft';
      profile.data.email = tokenResponse.account.idTokenClaims.email;
      profile.data.family_name = tokenResponse.account.idTokenClaims.family_name;
      profile.data.given_name = tokenResponse.account.idTokenClaims.given_name;
      return cb(profile.data);
    } catch (e) {
      this.yggdrasil.logger.error('MSGraph', e);
      cb(null);
      throw error;
    }
  }
}

module.exports = MicrosoftStrategy;