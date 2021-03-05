'use strict';

const twittersignin = require('twittersignin');
const request = require('axios');

/**
 * Can't use any passport strategy (all failed) we will use another one
 */
class TwitterStrategy {
  constructor(yggdrasil) {
    if (!yggdrasil.config.OAuth || !yggdrasil.config.OAuth.Twitter) {
      yggdrasil.fire('log', 'warn', '🤷‍️The Twitter OAuth strategy lacks of configuration information !');
      yggdrasil.fire('log', 'warn', '👉  Please put them into the .yggdrasilrc file as', '{ \n' +
        '      "OAuth": {\n' +
        '        "Twitter": {' +
        '          "consumerKey": "XX",\n' +
        '          "consumerSecret": "XX",\n' +
        '          "accessToken": "XX",\n' +
        '          "accessTokenSecret": "XX"\n' +
        '        }\n' +
        '      }\n' +
        '    })');

    } else {
      this.yggdrasil = yggdrasil;
      this.name = 'Twitter';

      this.config = {
        consumerKey: yggdrasil.config.OAuth.Twitter.consumerKey,
        consumerSecret: yggdrasil.config.OAuth.Twitter.consumerSecret,
        accessToken: yggdrasil.config.OAuth.Twitter.accessToken,
        accessTokenSecret: yggdrasil.config.OAuth.Twitter.accessTokenSecret
      };
      this.bearer = yggdrasil.config.OAuth.Twitter.bearer;
    }
  }

  init() {
    this.rootURL = this.rootURL || `${this.yggdrasil.server.protocol}://${this.yggdrasil.server.domain}:${this.yggdrasil.server.port}/api/auth/login/${this.name.toLowerCase()}`;

    this.strategy = twittersignin(this.config);
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
      const response = await this.strategy.getRequestToken();
      const requestToken = response.oauth_token;
      const requestTokenSecret = response.oauth_token_secret;
      const callbackConfirmed = response.oauth_callback_confirmed;
      if (callbackConfirmed) {
        // cache the token secret
        await this.yggdrasil.storageService.setCache({
          key: `token-${requestToken}`,
          body: requestTokenSecret,
          options: {
            ttl: 300
          }
        });

        return res.status(302).redirect(`https://api.twitter.com/oauth/authorize?oauth_token=${requestToken}`);
      }
      res
        .status(500)
        .json({
          status: 500,
          message: 'Internal Server Error'
        });
      this.yggdrasil.fire('log', 'error', 'Twitter Auth - getRequestToken : callback not confirmed');

      throw new Error('Callback not confirmed');
    }

    // second call :
    // Get the oauth_verifier query parameter
    const oauthVerifier = req.query.oauth_verifier;
    // Get the oauth_token query parameter.
    // It's the same as the request token from step 1
    const callbackToken = req.query.oauth_token;

    try {
      // Get the request token secret from cache
      const callbackTokenSecret = await this.yggdrasil.storageService.getCache(`token-${callbackToken}`);

      const accessInfos = await this.strategy.getAccessToken(callbackToken, callbackTokenSecret, oauthVerifier);

      const rawProfile = await request({
        method: 'GET',
        url: `https://api.twitter.com/1.1/users/show.json?user_id=${accessInfos.user_id}`,
        headers: {'Authorization': `Bearer ${this.bearer}`}
      });
      // lets pick the useful data
      let profile = ((
        {name, screen_name, location, profile_image_url_https, profile_banner_url}
      ) => (
        {name, screen_name, location, profile_image_url_https, profile_banner_url}
      ))(rawProfile.data);

      profile.provider = 'twitter';
      profile.id = rawProfile.data.id_str;
      return cb(profile);
    } catch (e) {
      this.yggdrasil.fire('log', 'error', 'Twitter OAuth', e);
      cb(null);
      throw e;
    }
  }
}

module.exports = TwitterStrategy;