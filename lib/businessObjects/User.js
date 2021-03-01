'use strict';

const {assign, castArray} = require('lodash');

/**
 * This is the user business object
 *
 * This user represent the high level object of the user who is currently logged in
 */
class User {
  constructor (yggdrasil, id) {
    this.yggdrasil = yggdrasil;
    this.data = {};
    this.policies = [];
    if (id) {
      this.id = (typeof id === 'object') ? id.toHexString() : id;
    } else {
      this.id = this.yggdrasil.uuid(true);
    }
  }

  get (id) {
    id = (typeof id === 'object') ? id.toHexString() : id;
    return this.yggdrasil.repositories.users.get(id || this.id, true, false)
      .then(data => {
        this.id = (typeof data.id === 'object') ? data.id.toHexString() : data.id;
        this.data = data.body;
        this.policies = data.body.policies;
        return this;
      });
  }

  async set (data) {
    await this.get();

    this.data = assign(this.data, data);

    return this.yggdrasil.repositories.users.set(this.data, this.id);
  }

  /**
   * Check if the current user have one of the policies
   * @param policies - {string|array<string>}
   * @param rootBypass - {boolean} : returns true if the user have the root polices
   * @return {boolean}
   */
  havePolicies (policies, rootBypass = true) {
    let matches;
    policies = castArray(policies);
    matches = policies.filter(p => this.policies.includes(p)).length;

    if (matches === 0) {
      if (rootBypass) {
        return this.policies.includes('root');
      }
      return false;
    }
    return true;
  }

  /**
   * Check if the current user have only the given policies
   * @param policies - {string|array<string>}
   * @param rootBypass - {boolean} : returns true if the user have the root polices
   * @returns {boolean}
   */
  havePoliciesOnly(policies, rootBypass = false) {
    let matches;
    policies = castArray(policies);
    matches = policies.filter(p => this.policies.includes(p)).length;
    if (matches === policies.length && this.policies.length === policies.length) {
      return true;
    }
    if (rootBypass) {
      return this.policies.includes('root');
    }
    return false;
  }
}

module.exports = User;