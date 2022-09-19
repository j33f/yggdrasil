'use strict';

const OAuthStrategy = require('./OAuthStrategy');
const Strategy = require('passport-google-oauth2').Strategy;

class GoogleStrategy extends OAuthStrategy {
  constructor(yggdrasil) {
    super(yggdrasil, 'Google', Strategy, ['email', 'profile']);
  }
}

module.exports = GoogleStrategy;