'use strict';

const Repository = require('./Repository');

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

  /**
   * Add a simple repository
   *
   * This allows to add a simple repository, for instance, from config, database or programmatically
   * @param name
   * @param index
   * @param collection
   * @param routesAndListeners
   * @param controller
   * @param storage
   * @returns {boolean}
   */
  addRepository(name, index, collection, routesAndListeners = {}, controller = null, storage = null) {
    const repoEntryName = name.toLowerCase();
    if (this[repoEntryName]) {
      this.yggdrasil.logger.warn(`A repository named "${name}" already exists !`);
      return false;
    }
    this[repoEntryName] = new Repository(name, index, collection, this.yggdrasil);
    return true;
  }
}

module.exports = Repositories;
