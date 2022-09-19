'use strict';

const crypt = require('crypto');

class StorageStrategy {
  constructor(name, storageType, config) {
    this.name = name;
    this.storageType = storageType;
    this.config = config;
  }

  getBufferMD5Hash (buffer) {
    return crypt.createHash('md5')
      .update(buffer)
      .digest('base64');
  }
}

module.exports = StorageStrategy;