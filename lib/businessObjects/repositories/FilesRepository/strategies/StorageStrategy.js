'use strict';

class StorageStrategy {
  constructor(name, storageType, config) {
    this.name = name;
    this.storageType = storageType;
    this.config = config;
  }
}

module.exports = StorageStrategy;
