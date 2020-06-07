'use strict';

const
  CredentialsRepository = require('./CredentialsRepository'),
  UsersRepository = require('./UsersRepository'),
  FilesRepository = require('./FilesRepository'),
  PDFRepository = require('./PDFRepository');

class Repositories {
  constructor(yggdrasil) {
    this.credentials = new CredentialsRepository(yggdrasil);
    this.users = new UsersRepository(yggdrasil);
    this.files = new FilesRepository(yggdrasil);
    this.pdf = new PDFRepository(yggdrasil);

    this.plugins = {};
    Object.keys(yggdrasil.plugins.repositories).forEach(pluginName => {
      this.plugins[pluginName] = {};
      Object.keys(yggdrasil.plugins.repositories[pluginName]).forEach(repoName => {
        this.plugins[pluginName][repoName] = new yggdrasil.plugins.repositories[pluginName][repoName](yggdrasil);
      });
    });
  }
}

module.exports = Repositories;
