'use strict';
/**
 * Stub the entire yggdrasil object members if needed in tests
 */
require('module-alias/register');

const
  sinon = require('sinon');

let yggdrasil = require('@root/yggdrasil');

const isGetter = (x, name) => (Object.getOwnPropertyDescriptor(x, name) || {}).get;
const isFunction = (x, name) => typeof x[ name ] === 'function';
const deepFunctions = x =>
  x && x !== Object.prototype &&
  Object.getOwnPropertyNames(x)
    .filter(name => isGetter(x, name) || isFunction(x, name))
    .concat(deepFunctions(Object.getPrototypeOf(x)) || []);
const distinctDeepFunctions = x => {
  if (deepFunctions(x)) {
    return Array.from(new Set(deepFunctions(x)));
  }
  return [];
};
const userFunctions = x => distinctDeepFunctions(x).filter(name => name !== 'constructor' && name.indexOf('__') !==1);

// set test config
yggdrasil.config = require('@unitTests/testConfig.json');

// Instantiate repositories
yggdrasil.repositories = new yggdrasil.lib.models.repositories(yggdrasil);

// Stubbing logger
const loggerMembers = ['error', 'warn'];

loggerMembers.forEach(member => {
  sinon.stub(yggdrasil.logger, member);
});

//Stubbing yggdrasil.uuid
sinon.stub(yggdrasil, 'uuid');
yggdrasil.uuid.withArgs(true).returns('anUUID');
yggdrasil.uuid.withArgs(false).returns({toHexString: () => 'anUUID'});

// Stubbing repositories members
Object.keys(yggdrasil.repositories).forEach(repository => {
  const members = userFunctions(yggdrasil.repositories[repository]);

  members.forEach(member => {
    sinon.stub(yggdrasil.repositories[repository], member);
  });
});

// Stubbing Utils
Object.keys(yggdrasil.lib.utils).forEach(lib => {
  if (typeof yggdrasil.lib.utils[lib] !== 'function') {
    const members = userFunctions(yggdrasil.lib.utils[lib]);
    members.forEach(member => {
      sinon.stub(yggdrasil.lib.utils[lib], member);
    });
  } else {
    sinon.stub(yggdrasil.lib.utils, lib);
  }
});

// Stubbing storage
Object.keys(yggdrasil.storage).forEach(storage => {
  const members = userFunctions(yggdrasil.storage[storage]);

  members.forEach(member => {
    if (member !== 'yggdrasil') {
      sinon.stub(yggdrasil.storage[storage], member);
    }
  });
});

// Stubbing yggdrasil.proxy
userFunctions(yggdrasil.proxy).forEach(member => {
  if (member !== 'yggdrasil') {
    sinon.stub(yggdrasil.proxy, member);
  }
});

// Stubbing controllers
Object.keys(yggdrasil.lib.controllers).forEach(controller => {
  const members = userFunctions(yggdrasil.lib.controllers[controller]);

  members.forEach(member => {
    if (member !== 'yggdrasil') {
      sinon.stub(yggdrasil.lib.controllers[controller], member);
    }
  });
});

// Stubbing LPM controllers
Object.keys(yggdrasil.lib.controllers.lpm).forEach(controller => {
  const members = userFunctions(yggdrasil.lib.controllers.lpm[controller]);

  members.forEach(member => {
    if (member !== 'yggdrasil') {
      sinon.stub(yggdrasil.lib.controllers.lpm[controller], member);
    }
  });
});

module.exports = yggdrasil;