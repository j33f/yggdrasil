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
    this.addRepository('Auth', AuthRepository);
    this.addRepository('Users', UsersRepository);
    this.addRepository('Files', FilesRepository);
  }

  /**
   * Add a simple repository with default controller, routes...
   *
   * This allows to add a simple repository, for instance, from config, database or programmatically
   * @param name
   * @param index
   * @param collection
   * @param options
   * @returns {boolean}
   */
  addSimpleRepository(name, index, collection, options = {}) {
    const repoEntryName = name.toLowerCase();
    if (this[repoEntryName]) {
      this.yggdrasil.logger.warn(`A repository named "${name}" already exists !`);
      return false;
    }
    this[repoEntryName] = new Repository(name, index, collection, this.yggdrasil, options);
    return true;
  }

  /**
   * Add a repository from a class
   *
   * @param name
   * @param RepositoryClass
   * @returns {boolean}
   */
  addRepository(name, RepositoryClass) {
    const repoEntryName = name.toLowerCase();
    if (this[repoEntryName]) {
      this.yggdrasil.logger.warn(`A repository named "${name}" already exists !`);
      return false;
    }
    this[repoEntryName] = new RepositoryClass(this.yggdrasil);
    return true;
  }
}

module.exports = Repositories;
