'use strict';

const OAuthStrategy = require('./OAuthStrategy');
const Strategy = require('passport-github').Strategy;

class GithubStrategy extends OAuthStrategy {
  constructor(yggdrasil) {
    super(yggdrasil, 'Github', Strategy);
  }
}

module.exports = GithubStrategy;