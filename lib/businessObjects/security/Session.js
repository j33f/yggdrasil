'use strict';

const
  { castArray, cloneDeep } = require('lodash'),
  Bluebird = require('bluebird');

class Session {
  constructor (yggdrasil, initObject) {
    this.yggdrasil = yggdrasil;

    this.storage = {};
    this.id = this.yggdrasil.uuid();
    this.isLoggedIn = false;
    this.userId = null;

    if (initObject) {
      this.storage = initObject.storage;
      this.id = initObject.id;
      this.isLoggedIn = initObject.isLoggedIn;
      this.userId = initObject.userId;
      this.user = new this.yggdrasil.lib.models.security.user(this.userId);
    }
  }

  get(key) {
    return this.storage[key];
  }

  set(key, value) {
    const oldValue = cloneDeep(this.storage[key]);
    this.storage[key] = value;
    return oldValue;
  }

  delete(key) {
    const oldValue = cloneDeep(this.storage[key]);
    delete this.storage[key];
    return oldValue;
  }

  dump() {
    return {
      id: this.id,
      storage: this.storage,
      isLoggedIn: this.isLoggedIn,
      userId: this.userId
    };
  }

  restore(dump) {
    this.storage = dump.storage;
    this.id = dump.id;
    this.isLoggedIn = dump.isLoggedIn;
    this.userId = dump.userId;

    return this;
  }

  removeTokens (_tokens) {
    let tokens = [], removedTokens = [];
    if (_tokens === 'all' || _tokens === '*') {
      tokens = Array.from(this.tokens);
    } else {
      tokens = castArray(_tokens);
    }

    tokens.forEach(token => {
      if (this.tokens.has(token)) {
        this.tokens.delete(token);
        removedTokens.push(token);
      }
    });

    return Bluebird.resolve({
      removedTokens: removedTokens,
      isSessionDead: (this.tokens.size === 0)
    });
  }
}

module.exports = Session;