'use strict';

const StorageStrategy = require('./StorageStrategy');

const {createWriteStream, createReadStream, unlink} = require('fs');
const Bluebird = require('bluebird');
const path = require('path');

const unlinkAsync = Bluebird.promisify(unlink);

class S3 extends StorageStrategy {
  constructor(yggdrasil, config) {
    super('S3', 's3', config);
    this.yggdrasil = yggdrasil;
    this.s3 = new this.yggdrasil.lib.drivers.s3(yggdrasil, config);
  }

  /**
   * get the public file url
   * @param name
   * @param ext
   * @returns {*}
   */
  getLocation(name, ext) {
    return `${name}.${ext}`;
  }

  /**
   * Store the given buffer to a local file using given metadata
   * @param buffer<Buffer|Stream>
   * @param metadata<object>
   * @returns {Promise<any>}
   */
  store(buffer, metadata) {
    return this.s3.set(buffer, metadata.location, metadata.contentType, metadata.public, metadata.public);
  }

  /**
   * Delete the file from the file storage
   * @param location
   * @returns {Promise|*|never|Promise<any>|Promise<void>|*}
   */
  delete(location) {
    return this.s3.delete(location);
  }

  /**
   * Get the file and produce a ReadStream
   * @param metadata
   * @returns {{file: ReadStream, isStream: boolean}}
   */
  get(metadata) {
    return this.s3.get(metadata.location)
      .then((data) => {
        return {
          content: data.Body,
          isStream: true
        };
      });
  }
}

module.exports = S3;
