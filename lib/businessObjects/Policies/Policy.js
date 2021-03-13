'use strict';
const {merge} = require('lodash');

const baseCapabilities = {
  create: false,
  read: false,
  update: false,
  delete: false,
  list: false,
  search: false
};

class Policy {
  /**
   * A policy is an object which aims to store rules.
   *
   * Yggdrasil is working on a "whitelist" mode (ie: everything is prohibited unless some rule grand the ability to do so)
   * For example, if there are 3 policies and two of them prohibit something which is granted by another, the action is granted.
   *
   * Each policy is a child of root, root having two branches : powerUsers and simpleUsers where :
   * - root can do anything.
   * - powerUsers can be seen as "low level admins". You can, for instance, use the powerUsers children for your employees policies
   * - simpleUsers can be seen as... simple users. Your customers or your service users.
   *
   * Every user inherit capabilities form its set policies.
   * Every policies inherit capabilities from its parents
   *
   * Each capability is related to :
   * - an object type
   * - a verb
   * - a relationship between the object and the current policy.
   *
   * For example the following capability grant the create action (verb = create) for the object type "bills" to the "sales" policy.
   * bills: {
   *   create: ['sales']
   * }
   *
   * Verbs are :
   * - create
   * - read
   * - update
   * - delete
   * - list
   * - search
   *
   * Some special "policy names" can be used :
   * - same: for "same policy" used for users
   * - parent: for "is this policy a parent of one of the users policy ?", used for users
   * - child: same principle as parent
   * - owner: for "owner of a document" aka "does the user referenced by its id in the meta.owner field got this policy ?"
   * - creator: for "the object creator" aka "does the user referenced by uts id in the meta.createdBy field got this policy ?"
   *
   * @param yggdrasil
   * @param name
   * @param parents
   * @param children
   * @param rules
   */
  constructor(yggdrasil, {name, parents, children}, rules) {
    this.yggdrasil = yggdrasil;
    this.name = name;
    this.parents = parents;
    this.children = children;
    this._globalRules = rules;
    this.rules = {};
    this._rawRules = {};

    this._is = {
      owner: this._isOwner,
      creator: this._isCreator,
      same: this._isSame,
      parent: this._isParent,
      child: this._isChild,
      powerUsers: this._isPowerUser,
      simpleUsers: this._isSimpleUser
    };

    this._compileRules();
  }

  /**
   * Is the current user is considered as an owner of the given document ?
   * @param params
   * @returns {boolean}
   * @private
   */
  _isOwner(params) {
    let rules = [];
    rules.push((params.object._id === params.user.id));
    rules.push((params.object.body.userId === params.user.id));
    rules.push((params.object.meta.owner === params.user.id));
    return rules.some(e => e);
  }

  /**
   * Is the current user is the creator of the given document ?
   * @param params
   * @returns {boolean}
   * @private
   */
  _isCreator(params) {
    let rules = [];
    rules.push((params.object._id === params.user.id));
    rules.push((params.object.body.userId === params.user.id));
    rules.push((params.object.meta.createdBy === params.user.id));
    return rules.some(e => e);
  }

  /**
   * Is this policy is se same as one of the given user ?
   * @param params
   * @returns {boolean}
   * @private
   */
  _isSame(params) {
    let rules = [];
    if (params.object.meta.createdBy) {
      try {
        const objectCreator = this.yggdrasil.businessObjects.users.get(params.object.meta.createdBy);
        const objectCreatorPolicies = objectCreator.body.policies || [];
        rules.push(objectCreatorPolicies.includes(this.name));
      } catch(e) {
        // continue regardless of error
      }
    }
    if (params.object.body.policies) {
      rules.push(params.object.body.policies.includes(this.name));
    }
    return rules.some(e => e);
  }

  /**
   * is this policy a parent of a given object policy ?
   * @param params
   * @returns {*}
   * @private
   */
  _isParent(params) {
    const policies = params.object.body.policies || [];
    return this.parents.some(p => policies.includes(p));
  }

  /**
   * is this policy a child of a given object policy
   * @param params
   * @returns {*}
   * @private
   */
  _isChild(params) {
    const policies = params.object.body.policies || [];
    return this.children.some(p => policies.includes(p));
  }

  /**
   * is this policy can be considered as a power user ?
   * @returns {boolean}
   * @private
   */
  _isPowerUser() {
    return [
      this.parents.includes('powerUsers'),
      this.name === 'powerUsers',
      this.name === 'root'
    ].some(e => e);
  }

  /**
   * is this policy can be considered as a simple user ?
   * @returns {boolean}
   * @private
   */
  _isSimpleUser() {
    return [
      this.parents.includes('simpleUsers'),
      this.name === 'simpleUsers'
    ].some(e => e);
  }

  /**
   * Compile the rules for this policy
   * @private
   */
  _compileRules() {
    // for each type in global rules...
    Object.keys(this._globalRules.types).forEach(type => {
      // for each policy in type
      Object.keys(this._globalRules.types[type], policy => {
        // if the policy described is * or is exactly for this policy, or applies for one of its parents
        if (policy === '*' || policy === this.name || this.parents.includes(policy)) {
          // then add this rule to this policy's rules
          this._rawRules[type] = this._rawRules[type] || {};
          this._rawRules[type] = merge(this._rawRules[type], this._globalRules.types[type][policy]);
        }
      });
    });

    // for each type in this policy's rules
    Object.keys(this._rawRules).forEach(type => {
      let rules = {};

      // for each verb for this type
      Object.keys(this._rawRules[type]).forEach(verb => {
        // extract the rules
        const _rules = this._rawRules[type][verb];
        let verbRules = [];
        // for each rule
        _rules.forEach(_rule => {
          if (this._is[_rule]) {
            // if the rule exists, add it to the rules list of this verb
            verbRules.push(this._is[_rule]);
          } else {
            this.yggdrasil.fire('log', 'warn', `The rule ${_rule} do not exists (for type ${type} and verb ${verb})`);
          }
        });
        // create a ruleset for this verb
        rules[verb] = params => { return verbRules.some(r => r(params));};
      });
      // add the rules for this type to this policy's rules
      this.rules[type] = {...baseCapabilities, ...rules};
    });
  }

  /**
   * can this policy do something (verb) with the given object of type objectType given a user
   * @param verb
   * @param objectType
   * @param object
   * @param user
   * @returns {boolean|*}
   */
  can(verb, objectType, object, user) {
    // if this policy is root : grant immediately
    if (this.name === 'root') {
      return true;
    }
    // if this policy have some rules for this object type...
    if (this.rules[objectType]) {
      // apply the rules
      return this.rules[objectType][verb]({object, user});
    }
    // nothing granted by default
    return false;
  }
}

module.exports = Policy;