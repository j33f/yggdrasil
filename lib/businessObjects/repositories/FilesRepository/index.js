'use strict';

const Repository = require('../Repository');
const request = require('axios');
const path = require('path');
const mime = require('mime-to-extensions');

const routes = require('./routes');

const repoOptions = {
  routes: routes,
  protected: true
};

class FilesRepository extends Repository {
  constructor(yggdrasil, name = 'Files') {
    super(name, 'files', 'metadata', yggdrasil, repoOptions);

    this.fileStorageConfig = yggdrasil.config.fileStorage;
    if (this.fileStorageConfig.strategies[this.fileStorageConfig.strategy]) {
      this.strategyConfig = this.fileStorageConfig.strategies[this.fileStorageConfig.strategy];
    } else {
      this.strategyConfig = this.fileStorageConfig.strategies.local;
    }
    const FileStorageStrategy = require('./strategies/' + this.strategyConfig.lib);
    this.strategy = new FileStorageStrategy(yggdrasil, this.strategyConfig);

    this.backendUrl = yggdrasil.config.externalServerBaseURL;
    this.maxHttpGetRetries = 5;
  }

  /**
   * compute the current backend url if not already computed
   */
  _getBackendUrl() {
    this.backendUrl = this.backendUrl || this.yggdrasil.server.protocol + '://' + this.yggdrasil.server.domain + ':' + this.yggdrasil.server.port;
  }

  /**
   * get the file url to access it
   * @param metadata
   * @param fileId
   * @returns {string}
   */
  _getFileUrl(metadata, fileId) {
    if (!this.backendUrl) {
      this._getBackendUrl();
    }
    return [this.backendUrl, 'files', metadata.type, fileId].join('/');
  }

  /**
   * An alias for get
   * @param id
   * @returns {*}
   */
  _getMetadata(id) {
    return super.get(id);
  }

  /**
   * Get the name to display into listings / user friendly name
   * @param metas
   * @returns {string|*}
   */
  _getDisplayName (metas) {
    if (path.extname(metas.displayName) === '') {
      return metas.displayName + '.' + mime.extension(metas.mimeType);
    }
    return metas.displayName;
  }

  /**
   * Get the file location
   * @param name
   * @param ext
   * @returns {*}
   * @private
   */
  _getLocation(name, ext) {
    return this.strategy.getLocation(name, ext);
  }

  /**
   * Generate a metadata set for a file prior to store it
   * @param id
   * @param metas
   * @returns {*}
   * @private
   */
  async _createMetadata (id, metas) {
    return {
      displayName: this._getDisplayName(metas),
      mimeType: metas.mimeType,
      uploadedAt: Date.now() / 1000 | 0,
      uploadedBy: metas.userId || metas.uploadedBy || null,
      location: this._getLocation(id, mime.extension(metas.mimeType)),
      description: metas.description || null,
      type: metas.type || 'misc',
      public: metas.public || false
    };
  }

  /**
   * Store the file
   * @param id
   * @param metadata
   * @param input
   * @param options
   * @returns {Promise<void>}
   * @private
   */
  async _storeFile(id, metadata, input, options) {
    await this.strategy.store(input, metadata, options || {});
  }

  /**
   * get file from HTTP
   * @param options
   * @returns {Promise<any>}
   * @private
   */
  async _getFileFromHttp(options) {
    return request(options);
  }

  /**
   * retrieve then set a file from a given url
   * @param id
   * @param url
   * @param metadata
   * @returns {*}
   */
  async _setFromUrl (id, url, metadata = {}) {
    const requestOptions = {
      method: 'get',
      url: url,
      responseType: 'stream'
    };
    const requestResponse = await this._getFileFromHttp(requestOptions);
    const idMeta = {
      _id: id
    };
    await this._storeFile(id, metadata, requestResponse.data, {isStream: true});

    return {
      metadata: {...metadata, ...idMeta},
      fileUrl: this._getFileUrl(metadata, id)
    };
  }

  /**
   * Set a file from a buffer
   * @param id
   * @param buffer
   * @param metadata
   * @returns {*}
   */
  async _setFromBuffer (id, buffer = new Buffer(), metadata = {}) {
    const idMeta = {
      _id: id
    };
    await this._storeFile(id, metadata, buffer);
    return {
      metadata: {...metadata, ...idMeta},
      fileUrl: this._getFileUrl(metadata, id)
    };
  }

  /**
   * Set a file from a raw string
   * @param id
   * @param string
   * @param metadata
   * @param encoding
   * @returns {*}
   */
  async _setFromString (id, string, metadata = {}, encoding = 'utf8') {
    const idMeta = {
      _id: id
    };
    await this._storeFile(id, metadata, string, {encoding: encoding});
    return {
      metadata: {...metadata, ...idMeta},
      fileUrl: this._getFileUrl(metadata, id)
    };
  }

  /**
   * Set a file from a base 64 string
   * @param id
   * @param base64
   * @param metadata
   * @returns {*}
   */
  async _setFromBase64 (id, base64, metadata = {}) {
    const idMeta = {
      _id: id
    };
    await this._storeFile(id, metadata, base64, {encoding: 'base64'});
    return {
      metadata: {...metadata, ...idMeta},
      fileUrl: this._getFileUrl(metadata, id)
    };
  }

  /**
   * Set a file from a stream
   * @param id
   * @param stream
   * @param metadata
   * @returns {*}
   */
  async _setFromStream (id, stream, metadata = {}) {
    const idMeta = {
      _id: id
    };
    await this._storeFile(id, metadata, stream, {isStream: true});
    return {
      metadata: {...metadata, ...idMeta},
      fileUrl: this._getFileUrl(metadata, id)
    };
  }

  /**
   * Delete from filesystem
   * @param location
   * @returns {Promise<void>}
   * @private
   */
  async _deleteFile(location) {
    await this.strategy.delete(location);
  }

  /**
   * Overrides the ancestor get method : retrieve the file's metadata, inject proper user information from uploadedBy property
   * and create an url to access the document from a frontend
   * @param id
   * @param noCache
   * @returns {*}
   */
  async get(id, noCache = false) {
    const rawMetadata = await super.get(id, noCache);
    const user = await this.yggdrasil.repositories.users.get(rawMetadata.uploadedBy);
    const userMeta = {
      uploadedByUser: {
        id: user._id,
        fullName: user.body.identity.firstName + ' ' + user.body.identity.lastName + ' (' + user.body.identity.trigram + ')'
      }
    };

    return {
      metadata: {...rawMetadata.body, ...userMeta},
      fileUrl: this._getFileUrl(rawMetadata.body, id)
    };
  }

  /**
   * Get a stream from the file strategy
   * @param metadata
   * @returns {*}
   */
  getFile(metadata) {
    return this.strategy.get(metadata);
  }

  /**
   * Overrides the ancestors set method
   * @param body
   * @param id
   * @param fileUrl
   * @param fileContent
   * @param isBase64
   * @param encoding
   * @param isStream
   * @returns {*}
   */
  async set(body, id, fileUrl = '', fileContent = '', isBase64 = false, encoding = null, isStream = false) {
    fileUrl = fileUrl || '';
    fileContent = fileContent || '';

    const file = body.file || {};
    const metadata = this._createMetadata({
      displayName: this._getDisplayName({
        displayName: body.displayName,
        mimeType: body.mimeType || file.mimetype
      }),
      mimeType: body.mimeType || file.mimetype,
      uploadedBy: body.userId || null,
      description: body.description || null,
      type: body.type || 'misc'
    });

    // there is a file to retrieve
    if (fileUrl !== '') {
      await this._setFromUrl(id, fileUrl, metadata);
    }
    if (isBase64 && fileContent !== '') {
      // fileContent is base64
      await this._setFromBase64(id, fileContent, metadata);
    }
    if (encoding) {
      // fileContent is a string
      await this._setFromString(id, fileContent, metadata, encoding);
    }
    if (isStream) {
      // fileContent is a stream
      await this._setFromStream(id, fileContent, metadata);
    }
    if (!isStream && fileContent !== '') {
      // fileContent is a Buffer
      await this._setFromBuffer(id, fileContent, metadata);
    }
    return super.set(metadata, id);
  }

  /**
   * Delete the document and ots metadata
   * @param id
   * @returns {*}
   */
  async delete(id) {
    const metadata = await super.get(id);
    await this._deleteFile(metadata.body.location);
    return super.delete(id);
  }

  /**
   * Update metadata
   * @param metas
   * @returns {Promise<*>}
   */
  async updateMetas (metas) {
    metas = metas.metadata || metas;

    let metadata = await super.get(metas._id);

    metadata.description = metas.description || metadata.description;
    metadata.type = metas.type || metadata.type;
    metadata.shared = metas.shared || metadata.shared;
    return super.set(metadata, metas._id);
  }
}

module.exports = FilesRepository;
