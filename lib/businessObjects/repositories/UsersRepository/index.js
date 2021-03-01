'use strict';

const Repository = require('../Repository');
const Bluebird = require('bluebird');
const {compact, castArray} = require('lodash');

const controller = require('./controller');
const model = require('./model');
const routes = require('./routes');
const socketIOListeners = require('./socketIOListeners');

const options = {
  controller: controller,
  model: model,
  routes: routes,
  socketIOListeners: socketIOListeners,
  protected: true // no default routes
};

class UsersRepository extends Repository {

  constructor (yggdrasil) {
    super('Users', 'users', 'data', yggdrasil, options);
  }

  /**
   * Augment the user data with credentials data if any
   * @param id
   * @param nocache
   * @returns {*}
   */
  async get (id, nocache = false) {
    const user = await super.get(id, nocache);
    try {
      user.body.credentials = await this.yggdrasil.repositories.auth.getForUserId(id);
    } catch(e) {
      this.yggdrasil.logger.warn(`There are no credentials for user id ${id}`);
    }
    return user;
  }

  /**
   * Remove any credentials reference is any before to set
   * @param body
   * @param id
   * @returns {*}
   */
  set (body, id) {
    if (body.credentials) {
      delete body.credentials;
    }
    return super.set(body, id);
  }

  /**
   * Augment the users data with credentials data if any
   *
   * @param params
   */
  list (params) {
    return super.list(params)
      .then(users => {
        return Bluebird.map(users.list, user => {
          return this.yggdrasil.repositories.auth.getForUserId(user._id)
            .then(credentials => {
              user.credentials = credentials;
              return Bluebird.resolve(user);
            })
            .catch(() => {
              return Bluebird.resolve(user);
            });
        })
          .then(mapResult => {
            return Bluebird.resolve({
              list: compact(mapResult)
            });
          });
      });
  }

  /**
   * Find objects sharing the same data depending on the type
   * @param value = the value to find
   * @param type - what type of property do we have to check
   * @returns {Promise<Array>} the found objects list
   */
  findDupes (value, type) {
    let keys = '';

    if (!value) {
      // we have no value to check : nothing to find
      return Bluebird.resolve({list: []});
    }

    switch (type) {
      case 'email':
        keys = ['contact.email'];
        value = this.yggdrasil.lib.utils.format.email(value);
        break;
      case 'phone':
        keys = ['contact.phones.mobile', 'contact.phones.office'];
        value = this.yggdrasil.lib.utils.format.phone(value);
        break;
      case 'trigram':
        keys = ['identity.trigram'];
        value = value.toUpperCase();
        break;
      default:
        keys = castArray(type);
        break;
    }
    return super.findDupes(value, keys);
  }
}

module.exports = UsersRepository;
