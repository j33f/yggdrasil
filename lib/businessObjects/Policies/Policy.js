'use strict';

class Policy {
  constructor(yggdrasil, {name, parents, children}, rules) {
    this.yggdrasil = yggdrasil;
    this.name = name;
    this.parents = parents;
    this.children = children;
    this._globalRules = rules;
    this.rules = {};

    this._compileRules();
  }

  _compileRules() {
    this.rules.crudls = [];
    Object.keys(this._globalRules.types).forEach(type => {
      Object.keys(this._globalRules.types[type]).forEach(policy => {
        if(policy === '*') {
          Object.keys(this._globalRules.types[type][policy]).forEach(verb => {
            this._globalRules.types[type][policy][verb].forEach(rule => {
              switch (rule) {
                case 'owner':
                  this.rules.crudls.push(parameters => {
                    const rules = [
                      (parameters.userId === parameters.object.userId),
                      (parameters.userId === parameters.object.id),
                      (parameters.userId === parameters.object._id)
                    ];
                    return rules.some(r => r);
                  });
                  break;
                case 'creator':
                  this.rules.crudls.push(parameters => {
                    const rules = [
                      (parameters.userId === parameters.object.userId),
                      (parameters.userId === parameters.object.createdBy)
                    ];
                    return rules.some(r => r);
                  });
                  break;
            }
            });
          });
        }
      })
    });
  }

  canCRUDLSPolicyUser(verb, policy) {
    let targetPolicy = {};
    // anonymous can do nothing
    if (this.name === 'anonymous') {
      return false;
    }
    // root can do everything
    if (this.name === 'root') {
      return true;
    }
    try {
      targetPolicy = this.yggdrasil.policiesManager.getPolicy(policy);
    } catch(e) {
      // can't get policy : cant do anything with it
      this.yggdrasil.fire('log', 'warn', e.message);
      this.yggdrasil.fire('log', 'warn', e.stack);
      return false;
    }
    // powerUsers can read or list other powerUsers
    if (['read', 'list'].includes(verb) && this.parents.includes('powerUsers') && !targetPolicy.data.parents.includes('simpleUsers')) {
      return true;
    }
    // powerUsers can create or update their own children
    if (['create', 'update', 'search'].includes(verb) && this.parents.includes('powerUsers') && this.children.includes(policy)) {
      return true;
    }

    // other case ? no
    return false;
  }

  canCRUDLSObject(verb, objectType) {
    Object.keys(this.yggdrasil)
    return false;
  }
}

module.exports = Policy;