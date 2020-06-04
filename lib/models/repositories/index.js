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
  }
}

module.exports = Repositories;
