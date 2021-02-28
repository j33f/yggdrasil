'use strict';

const bcrypt = require('bcryptjs');
const Bluebird = require('bluebird');
const ObjectID = require('mongodb').ObjectID;
const {v4: uuid} = require('uuid');

const Repository = require('../Repository');
const routes = require('./routes');
const controller = require('./controller');
const OAuthStrategies = require('./OAuthStrategies');

class AuthRepository extends Repository {
  constructor(yggdrasil, name = 'Auth') {
    super(name, 'users', 'auth', yggdrasil, {routes: routes, controller: controller});

    this.yggdrasil.OAuthStrategies = OAuthStrategies(yggdrasil);
    this.yggdrasil.logger.info('🛂  OAuth strategies instantiated');
  }

  addOAuthStrategy(name, strategy) {
    this.yggdrasil.OAuthStrategies[name] = strategy;
  }

  /**
   * Get credentials from id
   * @param id
   * @return {*|PromiseLike<T | never>|Promise<T | never>}
   */
  async get(id) {
    const response = await super.get(id, true);
    let credentials = response.body;
    credentials.password = '****';
    return credentials;
  }

  /**
   * Get the user for the corresponding id
   * @param userId
   * @param noTemporary
   * @return {*|PromiseLike<T | never>|Promise<T | never>}
   */
  async getForUserId(userId, noTemporary = false) {
    let credentials = [];

    const response = await super.search({
      query: {
        $or: [
          {userId: userId},
          {userId: new ObjectID(userId)}
        ]
      }
    });

    response.list.forEach(cred => {
      if (noTemporary && !cred.temporary || !noTemporary) {
        if (cred.password) {
          cred.password = '****';
        }
        credentials.push(cred);
      }
    });

    return credentials;
  }

  /**
   * Set the new password for a credentials id
   * @param plainPassword
   * @param id
   * @return {Promise<any | never>}
   */
  async setPassword(plainPassword, id) {
    return super.update({
      _id: id,
      password: await bcrypt.hash(plainPassword, 10),
      lastUpdated: Date.now() / 1000 | 0
    });
  }

  /**
   * delete credentials corresponding to the given user id
   * @param id
   * @return {Promise<T | never>}
   */
  async deleteForUserId(id) {
    let promises = [];

    try {
      const response = await super.search({query: {userId: id}});
      response.list.forEach(cred => {
        promises.push(this.delete(cred._id));
      });
      return Bluebird.all(promises);
    } catch(e) {
      // dont really care about errors ?
      this.yggdrasil.logger.warn(e);
      return Bluebird.resolve();
    }
  }

  /**
   * Reset the password corresponding to the given email and key
   * @param key
   * @param email
   * @param password
   * @returns {*}
   */
  async resetPasswordWithKey(key, email, password) {
    const response = await super.search({
      query: {
        key: key,
        email: email
      }
    });
    await super.update({
      _id: response.body._id,
      key: uuid()
    });
    return this.setPassword(password, response.body._id);
  }

  /**
   * Initiate a password change request returns the generated key to send to the user
   * @param id
   * @returns {Promise<string>}
   */
  async passwordChangeRequest(id) {
    const key = uuid();

    await super.update({
      _id: id,
      key: key
    });

    return key;
  }

  /**
   * Initiate a password change request based on the user email
   * @param email
   * @returns {*}
   */
  async passwordChangeRequestFromEmail(email) {
    const response = await super.search({
      query: {
        email: email
      }
    });
    return this.passwordChangeRequest(response.body._id);
  }

  /**
   * Initiate a password change request based on the user id
   * @param userId : a user id
   * @returns {*}
   */
  async passwordChangeRequestFromUserId(userId) {
    const response = await this.getForUserId(userId);
    // an user can have many credentials (impersonation, Oauth... choose the right one)
    let crendentials = {};
    response.forEach(cred => {
      if (!cred.impersonated && cred.type === 'local') {
        crendentials = cred;
      }
    });
    return this.passwordChangeRequest(crendentials._id);
  }

  /**
   * Create credentials for the given userId
   * @param userId -  the user id
   * @param data -  the credentials data, defaults to a generated password
   * @param type - local, OAuth,... defaults to local
   * @returns {Promise<user|*>}
   */
  async createForUserId (userId, data, type = 'local') {
    const user = await this.yggdrasil.repositories.users.get(userId);
    switch(type) {
      case 'OAuth':
        return this.createOAuth(user, data);
      case 'local':
      default:
        return this.createLocal(user, data);
    }
  }

  /**
   * Create OAuth credentials for the given user
   * @param user
   * @param data
   * @returns {Promise<*>}
   */
  async createOAuth(user, data) {
    return super.create({
      userId: user._id || user.id,
      email: user.body.contact.email,
      lastUpdated: Date.now() / 1000 | 0,
      impersonated: data.impersonated || false,
      type: 'OAuth',
      OAuthData: data
    });
  }

  /**
   * Create local credentials for the given user
   * @param user
   * @param data
   * @returns {Promise<*>}
   */
  async createLocal(user, data) {
    const plainPassword = data.password || this.yggdrasil.lib.utils.generatePassword();
    const password = await bcrypt.hash(plainPassword, 10);
    await super.create({
      userId: user._id || user.id,
      email: user.body.contact.email,
      password: password,
      lastUpdated: Date.now() / 1000 | 0,
      impersonated: data.impersonated || false,
      type: 'local'
    });

    return {
      username: user.body.contact.email,
      password: plainPassword
    };
  }

  /**
   * Create an alternative local credentials in order to allow an admin to impersonate a user
   * @param userId
   * @param data
   * @returns {Promise<{password: (*|string), username}>}
   */
  async impersonate(userId, data) {
    const plainPassword = data.password || this.yggdrasil.lib.utils.generatePassword();

    const impersonatedUser = {
      _id: userId,
      body: {
        contact: {
          email: uuid()
        }
      }
    };

    await this.createLocal(impersonatedUser, {
      password: plainPassword,
      impersonated: true
    });

    return {
      username: impersonatedUser.body.contact.email,
      password: plainPassword
    };
  }

  /**
   * Challenge local credentials
   * @param username
   * @param password
   * @returns {Promise<*|string|null>}
   */
  async loginLocal(username, password) {
    const credentials = await super.search({
      query: {
        type: 'local',
        email: username
      }
    });

    const userCredentials = credentials.body;

    const good = await bcrypt.compare(password, userCredentials.password);

    if (!good && userCredentials.password !== password) {
      throw new Error('Bad Credentials (local)');
    } else if(userCredentials.password === password) {
      // imported/plain password: lets encrypt it before to log the user in
      this.yggdrasil.logger.info(`❗Plain Password to encrypt for #${userCredentials._id}`);
      await this.setPassword(password, userCredentials._id);
    }

    await super.update({
      _id: userCredentials._id,
      lastUsed: Date.now() / 1000 | 0
    });

    if (userCredentials.impersonated) {
      this.yggdrasil.logger.warn(`User login successful for id ${userCredentials.userId} (impersonated)`);
    } else {
      this.yggdrasil.logger.info(`User login successful for id ${userCredentials.userId} (local)`);
    }

    this.yggdrasil.fire('user/login', {
      id: userCredentials.userId
    });

    return userCredentials.userId;
  }

  /**
   * Login the user via the given OAuth data
   * @param data
   * @returns {Promise<*|string|null>}
   */
  async loginOAuth(data) {
    try {
      const foundCredentials = await super.search({
        query: {
          type: 'OAuth',
          'OAuthData.provider': data.provider,
          'OAuthData.id': String(data.id)
        }
      });

      const userCredentials = foundCredentials.body;

      await super.update({
        _id: userCredentials._id,
        lastUsed: Date.now() / 1000 | 0
      });

      this.yggdrasil.logger.info(`User login successful for id ${userCredentials.userId} (OAuth)`);

      this.yggdrasil.fire('user/login', {
        id: userCredentials.userId
      });

      return userCredentials.userId;
    } catch(e) {
      throw new Error('Bad Credentials (OAuth)');
    }
  }
}

module.exports = AuthRepository;