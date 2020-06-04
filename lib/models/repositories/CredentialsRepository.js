'use strict';

const
  Repository = require('./Repository'),
  Bluebird = require('bluebird'),
  bcrypt = require('bcryptjs'),
  ObjectID = require('mongodb').ObjectID,
  moment = require('moment');

moment().local();

class CredentialsRepository extends Repository {

  constructor(yggdrasil) {
    super('Credentials', 'users', 'credentials', yggdrasil);
  }

  /**
   * Get credentials from id
   * @param id
   * @return {*|PromiseLike<T | never>|Promise<T | never>}
   */
  get(id) {
    return super.get(id, true)
      .then(response => {
        let credentials = response.body;
        delete credentials.password;
        return credentials;
      });
  }

  /**
   * Get the user for the corresponding id
   * @param id
   * @param noTemporary
   * @return {*|PromiseLike<T | never>|Promise<T | never>}
   */
  getForUserId(id, noTemporary = false) {
    return super.search({
      query: {
        $or: [
          {userId: id},
          {userId: new ObjectID(id)}
        ]
      }
    })
      .then(response => {
        let credentials = [];
        response.list.forEach(cred => {
          if (noTemporary && !cred.temporary || !noTemporary) {
            delete cred.password;
            credentials.push(cred);
          }
        });

        return Bluebird.resolve(credentials);
      });
  }

  /**
   * Set the new password for a credentials id
   * @param plainPassword
   * @param id
   * @return {Promise<any | never>}
   */
  async setPassword(plainPassword, id) {
    const password = await bcrypt.hash(plainPassword, 10);
    return super.set({
      password: password,
      lastUpdated: moment().unix()
    }, id);
  }

  /**
   * delete credentials corresponding to the given user id
   * @param id
   * @return {Promise<T | never>}
   */
  deleteForUserId(id) {
    return super.search({query: {userId: id}})
      .then(response => {
        let promises = [];
        response.list.forEach(cred => {
          promises.push(this.delete(cred._id));
        });
        return Bluebird.all(promises);
      })
      .catch(() => {
        return Bluebird.resolve();
      });
  }

  /**
   * Reset the password corresponding to the given email and key
   * @param key
   * @param email
   * @param password
   * @returns {*}
   */
  resetPasswordWithKey(key, email, password) {
    return super.search({
      query: {
        key: key,
        email: email
      }
    })
      .then(response => {
        response.body.key = this.yggdrasil.lib.utils.generatePassword() + this.yggdrasil.lib.utils.generatePassword();
        return super.set(response.body, response.body._id)
          .then(() => {
            return this.setPassword(password, response.body._id);
          });
      });
  }

  /**
   * Request a password change for a user
   * @param id
   * @param email
   * @param ip
   * @return {*|PromiseLike<T | never>|Promise<T | never>}
   */
  passwordChangeRequest(id, email, ip) {
    const key = this.yggdrasil.lib.utils.generatePassword();

    return super.set({key: key}, id)
      .then(() => {
        const
          crmUrl = this.yggdrasil.server.protocol + '://' + this.yggdrasil.server.domain + ':' + this.yggdrasil.server.frontPort,
          resetUri = '/auth/reset-password';

        const data = {
          from: this.yggdrasil.config.emails.from,
          to: {
            name: email,
            email: email
          },
          subject: '[MCI CRM] Réinitialisation de votre mot de passe',
          templateId: this.yggdrasil.config.mailjet.templates.resetPassword,
          data: {
            resetUrl: crmUrl + resetUri,
            resetKey: key,
            actionUrl: crmUrl + resetUri + '?key=' + key,
            IP: ip
          }
        };

        return this.yggdrasil.lib.controllers.mail.send(
          this.yggdrasil,
          data
        );
      });
  }

  passwordChangeRequestFromEmail(email, ip) {
    return super.search({
      query: {
        email: email
      }
    })
      .then(response => {
        return this.passwordChangeRequest(response.body._id, response.body.email, ip);
      });
  }

  /**
   * When the request is made from a particular ID, it has been made by an admin
   * @param id : a user id !!! not credential id
   * @param ip
   * @returns {*}
   */
  passwordChangeRequestFromId(id, ip) {
    return this.getForUserId(id)
      .then(response => {
        // get the real user credentials (not the temporary ones)
        let crendentials = {};
        response.forEach(cred => {
          if (cred.temporaty !== true) {
            crendentials = cred;
          }
        });

        // change these credentials to reset its password
        return this.passwordChangeRequest(crendentials._id, crendentials.email, ip);
      })
      .then(() => {
        // set a new random password
        return this.setPassword(this.yggdrasil.lib.utils.generatePassword(), id);
      });
  }

  /**
   * Create credentials for the user identified by id
   * @param id
   * @param password - the optional password to set
   * @param referer - the frontend referer
   * @param sendViaEmail - do we have to send this password to the user via email ?
   * @returns {PromiseLike<T | never>}
   */
  createForUserId (id, password, referer, sendViaEmail = false) {
    let
      userFirstname = '',
      userEmail = '';

    return this.yggdrasil.repositories.users.get(id)
      .then(user => {
        const plainPassword = password || this.yggdrasil.lib.utils.generatePassword();

        userFirstname = user.body.identity.firstName;
        userEmail = user.body.contact.email;
        return this.create(id, user.body.contact.email, user.body.contact.email, user.body.identity.trigram, plainPassword, false);
      })
      .then(credentials => {

        // todo use general config for this
        const
          data = {
            from: this.yggdrasil.config.emails.from,
            to: {
              name: userFirstname,
              email: userEmail
            },
            subject: `[${this.yggdrasil.config.serviceName}] Création de votre compte utilisateur`,
            templateId: this.yggdrasil.config.mailjet.templates.newAccount,
            data: {
              user: userFirstname,
              username: credentials.userName,
              password: credentials.password,
              actionUrl: referer
            }
          };
        if ((password && sendViaEmail) || !password) {
          this.yggdrasil.lib.controllers.mail.send(
            this.yggdrasil,
            data
          );
        }
        return Bluebird.resolve(credentials);
      });
  }

  /**
   * Change a password for the user identified by id
   * @param id
   * @param password - the optional password to set
   * @param sendViaEmail - do we have to send this password to the user via email ?
   * @returns {PromiseLike<T | never>}
   */
  changePasswordForUserId (id, password, referer, sendViaEmail = false) {
    let
      userFirstname = '',
      userEmail = '',
      plainPassword = password || this.yggdrasil.lib.utils.generatePassword();

    return this.yggdrasil.repositories.users.get(id)
      .then(user => {
        userFirstname = user.body.identity.firstName;
        userEmail = user.body.contact.email;
        return this.getForUserId(id, true);
      })
      .then(credentials => {
        return this.setPassword(plainPassword, credentials[0]._id);
      })
      .then(() => {
        const
          data = {
            from: this.yggdrasil.config.emails.from,
            to: {
              name: userFirstname,
              email: userEmail
            },
            subject: '[MCI CRM] Nouveau mot de passe',
            templateId: this.yggdrasil.config.mailjet.templates.newPassword,
            data: {
              user: userFirstname,
              username: userEmail,
              password: plainPassword,
              actionUrl: referer
            }
          };
        if ((password && sendViaEmail) || !password) {
          this.yggdrasil.lib.controllers.mail.send(
            this.yggdrasil,
            data
          );
        }
        return Bluebird.resolve(true);
      });
  }
  /**
   * Create credentials for the given user id
   * @param userId
   * @param userName
   * @param email
   * @param trigram
   * @param plainPassword
   * @param temporary
   * @returns {*}
   */
  create(userId, userName = this.yggdrasil.uuid(), email = '', trigram = '', plainPassword = this.yggdrasil.lib.utils.generatePassword(), temporary = false) {
    return bcrypt.hash(plainPassword, 10)
      .then(password => {
        return super.set({
          userId: userId,
          userName: userName,
          email: email,
          trigram: trigram,
          password: password,
          lastUpdated: moment().unix(),
          temporary: temporary
        }, this.yggdrasil.uuid());
      })
      .then(() => {
        return Bluebird.resolve({
          userName: userName,
          password: plainPassword
        });
      });
  }

  /**
   * Create a temporary password for someone
   * @param id
   * @returns {*}
   */
  createTemporaryForId(id) {
    return this.create(id, this.yggdrasil.uuid(), '', '', this.yggdrasil.lib.utils.generatePassword(), true);
  }

  async challenge(username, challenge) {

    const credentials = await super.search({
      query: {
        userName: username
      }
    });

    let userCredentials = credentials.body;

    const good = await bcrypt.compare(challenge, userCredentials.password);

    if (good) {
      userCredentials.lastSeen = moment().unix();
      await super.update(userCredentials);
      return Bluebird.resolve(userCredentials.userId);
    }
    if (userCredentials.password === challenge) {
      // imported credential: lets encrypt it
      this.yggdrasil.logger.info('❗Plain Password to encrypt');
      await this.setPassword(challenge, userCredentials._id);
      userCredentials.lastSeen = moment().unix();
      userCredentials.lastUpdated = moment().unix();
      await super.update(userCredentials);
      return Bluebird.resolve(userCredentials.userId);
    }
    return Bluebird.reject(new Error('Bad Credentials'));
  }
}

module.exports = CredentialsRepository;
