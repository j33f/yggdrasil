'use strict';

const {castArray} = require('lodash');
const dot = require('dot-object');

const Policy = require('./Policy');

const baseConfig = require('./baseConfig');

class Policies {
  /**
   * @param yggdrasil
   * @param config
   */
  constructor(yggdrasil, config = {}) {
    this.yggdrasil = yggdrasil;
    this._baseConfig = baseConfig;
    this.config = {...baseConfig};

    config.tree = config.tree || {};
    if (config.tree.powerUsers) {
      this.config.tree.root.powerUsers = config.tree.powerUsers;
    }
    if (config.tree.simpleUsers) {
      this.config.tree.root.simpleUsers = config.tree.simpleUsers;
    }
    config.rules = config.rules || {};
    this._rules = {...baseConfig.rules, ...config.rules};

    this._policies = {
      tree: baseConfig.tree,
      flatTree: dot.dot(baseConfig.tree),
      list: [],
      objects: {}
    };

    this.policies = {};

    this.init();
  }

  get rules() {
    return this._rules;
  }

  set rules(rules) {
    this._rules = {...this._baseConfig.rules, rules};
  }

  init() {
    this._listPolicies();
    this._createPoliciesObjects();
  }

  _listPolicies() {
    let list = [];
    Object.keys(this._policies.flatTree).forEach(path => {
      const policies = path.split('.').filter(policy => !list.includes(policy));
      list = [...list, ...policies];
    });
    this._policies.list = list;
    return list;
  }

  _createPoliciesObjects() {
    const root = this._policies.flatTree;
    Object.keys(root).forEach(path => {
      const policies = path.split('.');
      this._createPolicyObject(policies);
      this._getChildren(policies);
    });

    this._policies.list.forEach(name => {
      this.policies[name] = new Policy(this.yggdrasil, this._policies.objects[name], this.rules);
    });
  }

  _createPolicyObject(policies) {
    let object = {};
    object.name = policies[policies.length-1];
    object.parents = policies.slice(0, policies.length-1);
    object.children = [];
    this._policies.objects[object.name] = object;
    if (object.parents.length > 0) {
      this._createPolicyObject(object.parents);
    }
  }

  _getChildren(policies) {
    policies.forEach((name, index) => {
      const children = policies.slice(index+1, policies.length-index+1);
      children.forEach(child => {
        if (!this._policies.objects[name].children.includes(child)) {
          this._policies.objects[name].children.push(child);
        }
      });
    });
  }

  addPolicy(name, parent) {
    name = name.trim();
    if (!name) {
      throw new Error('You must provide a valid policy name');
    }
    if (!parent) {
      throw new Error('You must provide a policy parent');
    }
    if (this._policies.list.includes(name)) {
      throw new Error(`The policy "${name}" already exists.`);
    }
    if (!this._policies.list.includes(parent)) {
      throw new Error(`The parent policy "${parent}" do not exist.`);
    }

    this._policies.tree[parent][name] = {};
    this.init();
  }

  getPolicy(name) {
    const policy = this.policies[name];
    if (policy) {
      return policy;
    }

    throw new Error(`Policy "${name}" do not exist.`);
  }

  _policiesCan(verb, policies, targetPolicy, testMethod) {
    let can = [];
    castArray(policies).forEach(policyName => {
      can.push(testMethod(verb, targetPolicy));
    });
    return can.some(e => e);
  }

  userCan(user, verb, objectType, objectOptions) {
    // does user can verb object which have objectOptions ?
    const userPolicies = user.data.policies;

    if (objectType === 'users') {
      return this._policiesCan(verb, userPolicies, objectOptions.policy, this.policies[policyName].canCRUDLSPolicyUser);
    }


  }
}

module.exports = Policies;