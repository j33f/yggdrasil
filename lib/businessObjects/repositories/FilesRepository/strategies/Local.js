'use strict';

const StorageStrategy = require('./StorageStrategy');

const {createWriteStream, createReadStream, unlink} = require('fs');
const Bluebird = require('bluebird');
const path = require('path');

const unlinkAsync = Bluebird.promisify(unlink);

class Local extends StorageStrategy {
  constructor(yggdrasil, config) {
    super('Local', 'local', config);
    this.yggdrasil = yggdrasil;
    this.storageRootPath = this.config.storageRootPath || '/var/app/fileStorage';
  }

  /**
   * Check if the location about to be used to store, get or delete a file is located inside the storage root path
   * @param location
   */
  _securityCheck(location) {
    const regex = new RegExp('^' + this.storageRootPath);
    if (!regex.test(location)) {
      const errorMessage = `The file at location ${location} is located outside of the storage root path (${this.storageRootPath}) and cannot be used.`;
      this.yggdrasil.logger.error(errorMessage);
      throw new Error(errorMessage);
    }
    return true;
  }

  /**
   * Generate the file location on the filesystem
   * @param id
   * @param ext
   * @returns {*}
   */
  getLocation(name, ext) {
    return path.join(
      path.resolve(this.fileStorage.path),
      name + '.' + ext
    );
  }

  /**
   * Store the given buffer to a local file using given metadata
   * @param buffer<Buffer|Stream>
   * @param metadata<object>
   * @param options<object> can have 'encoding' and 'isStream' member
   * @returns {Promise<any>}
   */
  store(buffer, metadata, options = {}) {
    let streamOptions = {};
    if (options.encoding) {
      streamOptions.encoding = options.encoding;
    }
    return new Bluebird((resolve, reject) => {
      try {
        this._securityCheck(metadata.location);
      } catch(e) {
        return Bluebird.reject(e);
      }
      const stream = createWriteStream(metadata.location, {});
      stream.on('finish', resolve);
      stream.on('error', reject);
      if (options.isStream) {
        buffer.pipe(stream);
      }
      if (options.isStream) {
        buffer.pipe(stream);
      } else {
        stream.write(buffer);
        stream.end();
      }
    });
  }

  /**
   * Delete the file from the file storage
   * @param location
   * @returns {Promise|*|never|Promise<any>|Promise<void>|*}
   */
  async delete(location) {
    try {
      this._securityCheck(location);
      await unlinkAsync(location);
    } catch (error) {
      if (error.code === 'ENOENT' && error.syscall === 'unlink') {
        // this is not the file you are looking for...
        // move along
        return Bluebird.resolve();
      }
      return Bluebird.reject(error);
    }
  }

  /**
   * Get the file and produce a ReadStream
   * @param metadata
   * @returns {{file: ReadStream, isStream: boolean}}
   */
  get(metadata) {
    this._securityCheck(metadata.location);
    return {
      content: createReadStream(metadata.location),
      isStream: true
    };
  }
}

module.exports = Local;