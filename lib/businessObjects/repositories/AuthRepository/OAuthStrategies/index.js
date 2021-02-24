const FacebookStrategy = require('./FacebookStrategy.js');
const GithubStrategy = require('./GithubStrategy.js');
const GoogleStrategy = require('./GoogleStrategy.js');
const MicrosoftStrategy = require('./MicrosoftStrategy');
const TwitterStrategy = require('./TwitterStrategy.js');

module.exports = (yggdrasil) => {
  return {
    facebook: new FacebookStrategy(yggdrasil),
    github: new GithubStrategy(yggdrasil),
    google: new GoogleStrategy(yggdrasil),
    microsoft: new MicrosoftStrategy(yggdrasil),
    twitter: new TwitterStrategy(yggdrasil)
  };
};