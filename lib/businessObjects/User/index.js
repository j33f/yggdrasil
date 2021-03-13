'use strict';

const {assign} = require('lodash');

/**
 * This is the user business object
 *
 * This user represent the high level object of the user who is currently logged in
 */
class User {
  constructor (yggdrasil, id) {
    this.yggdrasil = yggdrasil;
    this.data = {};
    this._policies = ['anonymous'];
    this.policies = [];

    if (id) {
      this.id = id;
      this._init();
    } else {
      this.new = true;
      this.id = yggdrasil.uuid(true);
    }

    this._initPolicies();
  }

  /**
   * Initialize user policies
   * @private
   */
  _initPolicies() {
    this._policies.forEach(name => {
      this.policies.push(this.yggdrasil.policies.get(name));
    });
  }

  /**
   * Initialize the user
   * @returns {Promise<void>}
   * @private
   */
  async _init() {
    const data = await this.yggdrasil.repositories.users.get(this.id, true, false);
    this.data = data.body;
    this.meta = data.meta;
    this._policies = data.policies || ['anonymous'];
  }

  /**
   * Alias for set
   * @param data
   * @returns {Promise<void>}
   */
  create(data) {
    return this.set(data);
  }

  /**
   * Set user data
   * @param data
   * @returns {Promise<void>}
   */
  async set(data = {}) {
    this.data = assign(this.data, data);

    await this.yggdrasil.repositories.users.set(this.data, this.id);
    this.new = false;
  }

  /**
   * Create credentials for the user
   *
   * The user must have been created first
   *
   * @param strategyType
   * @param strategyData
   * @returns {Promise<user|*>}
   */
  createCredentials(strategyData, strategyType = 'local') {
    if (this.new) {
      throw new Error('The user have to be created first');
    }
    return this.yggdrasil.repositories.auth.createForUserId(this.id, strategyData, strategyType);
  }

  /**
   * Given an object, and its object type, does this user can do che verb ?
   * @param verb
   * @param objectType
   * @param object
   * @returns {boolean}
   */
  can(verb, objectType, object) {
    let results = [];
    this.policies.forEach(policy => {
      results.push(policy.can(verb, objectType, object, this.data));
    });
    return results.some(e => e);
  }
}

module.exports = User;