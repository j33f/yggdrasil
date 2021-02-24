'use strict';

const AuthRepository = require('./AuthRepository');
const FilesRepository = require('./FilesRepository');
const UsersRepository = require('./UsersRepository');

class Repositories {
  constructor(yggdrasil) {
    this.yggdrasil = yggdrasil;

    this.initReprositories();
  }

  /**
   * Initialize repositories
   */
  initReprositories () {
    this.auth = new AuthRepository(this.yggdrasil);
    this.users = new UsersRepository(this.yggdrasil);
    this.files = new FilesRepository(this.yggdrasil);
  }
}

module.exports = Repositories;
