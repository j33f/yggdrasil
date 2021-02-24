'use strict';

const passport = require('passport');

class OAuthStrategy {
  constructor(yggdrasil, name, PassportStrategy, scope = [], stragegyConfig = {}, getProfile = null) {
    if (!yggdrasil.config.OAuth || !yggdrasil.config.OAuth[name]) {
      yggdrasil.logger.warn(`The ${name} OAuth strategy lacks of configuration information !`);
      yggdrasil.logger.warn('Please put them into the .yggdrasilrc file as', '{ \n' +
        '      "OAuth": {\n' +
        `        "${name}": {\n` +
        '          "clientId": "YOUR CLIENT ID HERE",\n' +
        '          "clientSecret": "YOUR CLIENT SECRET HERE"\n' +
        '        }\n' +
        '      }\n' +
        '    })');

    } else {
      this.yggdrasil = yggdrasil;
      this.name = name;
      this.clientCredentials = yggdrasil.config.OAuth[name];
      this.PassportStrategy = PassportStrategy;
      this.strategyConfig = stragegyConfig;
      this.scope = scope;
      this.getProfile = getProfile || this._getProfile;
      this.initialized = false;
    }
  }

  init() {
    this.rootURL = this.rootURL || `${this.yggdrasil.server.protocol}://${this.yggdrasil.server.domain}:${this.yggdrasil.server.port}/api/auth/login/${this.name.toLowerCase()}`;

    let strategyConfig = {
      clientID: this.clientCredentials.clientId,
      clientSecret: this.clientCredentials.clientSecret,
      consumerKey: this.clientCredentials.consumerKey,
      consumerSecret: this.clientCredentials.consumerSecret,
      callbackURL: this.rootURL + '/callback',
      passReqToCallback: true
    };

    this.strategy = this.strategy || new this.PassportStrategy({...strategyConfig, ...this.strategyConfig}, this._getProfile);

    passport.initialize();
    passport.use(this.strategy);

    this.authenticate = (req, res, next) => {
      passport.authenticate(this.name.toLowerCase(), { session: false, scope: this.scope}, next)(req, res, next);
    };
    this.initialized = true;
  }

  _getProfile(request, accessToken, refreshToken, profile, done) {
    done(profile);
  }
}

module.exports = OAuthStrategy;