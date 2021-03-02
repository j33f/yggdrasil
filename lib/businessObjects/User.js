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
    this.policies = ['anonymous'];
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

  /**
   * Can this user access another user informations
   *
   * @param user
   * @returns {boolean}
   */
  canAccessUser (user) {
    // root can access to everyone
    if (this.data.policies.includes('root')) {
      return true;
    }
    if (this.data.policies[0] === 'anonymous' || this.data.policies.length === 0) {
      return false;
    }

    if (user.policies) {
      // todo
    }

    // otherwise : no access
    return false;
  }

  /**
   * Builds query for user list filtering telling if the user can list the requested users
   *
   * @param data
   * @returns {boolean}
   */
  canListUsers (data) {

    /**
     * Test if userPolicy is compatible with queryPolicies
     * @param userPolicies
     * @param queryPolicies
     * @returns {function(*=): boolean}
     */
    const combinationMatcher = (userPolicies, queryPolicies) => rules =>
      Object.entries(rules).some(
        ([policy, allowed]) => userPolicies.includes(policy) && allowed.includes(queryPolicies)
      );

    const directionPolicies = ['root'];

    const internalPolicies = [
      'root'
    ];

    const externalPolicies = ['anonymous'];

    // if the user have none of those policies, he cannot list other users
    const canList = (
      internalPolicies.filter(policy => this.data.policies.includes(policy)).length > 0
      || externalPolicies.filter(policy => this.data.policies.includes(policy)).length > 0
    );
    // tells if current user policy matches policy from query: true when connected user can list users requested policy
    let authorizedCombination = (directionPolicies.filter(policy => this.data.policies.includes(policy)).length > 0);
    let matches;

    data.query = data.query || {};
    // Directors (CEO, COO, CCO) and root can list every users, thus no need to check policy queried.
    // In the other case, authorizedCombination is false until a user policy match is found.
    // This block checks if current user policy matches policy from query.
    if (canList && !authorizedCombination && data.query.policies) {
      data.query.policies = data.query.policies.trim();
      if (data.query.policies.length > 0) {
        matches = combinationMatcher(this.data.policies, data.query.policies);

        if (matches({
          root: ['root', 'anonymous']
        })) {
          authorizedCombination = true;
        }
      }
    }

    return authorizedCombination;
  };

}

module.exports = User;