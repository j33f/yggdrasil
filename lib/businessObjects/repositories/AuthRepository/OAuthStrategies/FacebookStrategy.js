'use strict';

const OAuthStrategy = require('./OAuthStrategy');
const Strategy = require('passport-facebook').Strategy;

class FacebookStrategy extends OAuthStrategy {
  constructor(yggdrasil) {
    super(
      yggdrasil,
      'Facebook',
      Strategy,
      ['email', 'public_profile'],
      {
        profileFields: [
          'id',
          'name',
          'email',
          //'first_name', // already included in 'public_profile' scope
          //'last_name',  // same
          'languages',
          'location',
          'short_name',
          'permissions',
          'picture'
        ]
      }
    );
  }
}

module.exports = FacebookStrategy;