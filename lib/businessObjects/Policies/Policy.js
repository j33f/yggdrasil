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

  _isOwner(params) {
    let rules = [];
    rules.push((params.object._id === params.user.id));
    rules.push((params.object.body.userId === params.user.id));
    rules.push((params.object.meta.owner === params.user.id));
    return rules.some(e => e);
  }

  _isCreator(params) {
    let rules = [];
    rules.push((params.object._id === params.user.id));
    rules.push((params.object.body.userId === params.user.id));
    rules.push((params.object.meta.createdBy === params.user.id));
    return rules.some(e => e);
  }

  _isSame(params) {
    let rules = [];
    if (params.object.meta.createdBy) {
      try {
        const objectCreator = this.yggdrasil.businessObjects.users.get(params.object.meta.createdBy);
        const objectCreatorPolicies = objectCreator.body.policies || [];
        rules.push(objectCreatorPolicies.includes(this.name));
      } catch(e) {}
    }
    if (params.object.body.policies) {
      rules.push(params.object.body.policies.includes(this.name));
    }
    return rules.some(e => e);
  }

  _isParent(params) {
    const policies = params.object.body.policies || [];
    return this.parents.some(p => policies.includes(p));
  }

  _isChild(params) {
    const policies = params.object.body.policies || [];
    return this.children.some(p => policies.includes(p));
  }

  _isPowerUser() {
    return [
      this.parents.includes('powerUsers'),
      this.name === 'powerUsers',
      this.name === 'root'
    ].some(e => e);
  }

  _isSimpleUser() {
    return [
      this.parents.includes('simpleUsers'),
      this.name === 'simpleUsers'
    ].some(e => e);
  }

  _compileRules() {
    Object.keys(this._globalRules.types).forEach(type => {
        Object.keys(this._globalRules.types[type], policy => {
          if (policy === '*' || policy === this.name || this.parents.includes(policy)) {
            this._rawRules[type] = this._rawRules[type] || {};
            this._rawRules[type] = merge(this._rawRules[type], this._globalRules.types[type][policy]);
          }
        });
    });

    Object.keys(this._rawRules).forEach(type => {
      let rules = {};

      Object.keys(this._rawRules[type]).forEach(verb => {
        const _rules = this._rawRules[type][verb];
        let verbRules = [];
        _rules.forEach(_rule => {
          if (this._is[_rule]) {
            verbRules.push(this._is[_rule]);
          } else {
            this.yggdrasil.fire('log', 'warn', `The rule ${_rule} do not exists (for type ${type} and verb ${verb})`);
          }
        });
        rules[verb] = params => { return verbRules.some(r => r(params));};
      });
      this.rules[type] = {...baseCapabilities, ...rules};
    });
  }

  can(verb, objectType, object, user) {
    if (this.name === 'root') {
      return true;
    }
    if (this.rules[objectType]) {
      return this.rules[objectType][verb]({object, user});
    }
    return false;
  }
}

module.exports = Policy;