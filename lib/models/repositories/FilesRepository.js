'use strict';

const
  Repository = require('./Repository'),
  Bluebird = require('bluebird'),
  fs = require('fs'),
  request = require('request-promise'),
  path = require('path'),
  writeFile = Bluebird.promisify(fs.writeFile),
  mime = require('mime-to-extensions'),
  moment = require('moment');

const unlink = Bluebird.promisify(fs.unlink);

class FilesRepository extends Repository {

  constructor(yggdrasil, name = 'Files') {
    super(name, 'files', 'metadata', yggdrasil);
    this.fileStorage = yggdrasil.config.fileStorage;
    this.backendUrl = undefined;
  }

  getBackendUrl() {
    this.backendUrl = this.yggdrasil.server.protocol + '://' + this.yggdrasil.server.domain + ':' + this.yggdrasil.server.port;
  }

  /**
   * Overrides the ancestor get method : retrieve the file's metadata, inject proper user information from uploadedBy property
   * and create an url to access the document from a frontend
   * @param id
   * @returns {*}
   */
  get(id) {
    if (!this.backendUrl) {
      this.getBackendUrl();
    }

    return super.get(id)
      .then(metadata => {

        return Bluebird.resolve({
          metadata: metadata.body,
          fileUrl: [ // TODO generate an url where rights are checked
            this.backendUrl,
            'fs',
            metadata.body.displayName]
            .join('/')
        });
      })
      .then(response => {
        return this.yggdrasil.repositories.users.get(response.metadata.uploadedBy)
          .then(user => {
            response.metadata.uploadedByUser = {
              id: user._id,
              fullname: user.body.identity.firstName + ' ' + user.body.identity.lastName + ' (' + user.body.identity.trigram + ')'
            };
            return Bluebird.resolve(response);
          });
      });
  }

  /**
   * An alias for get
   * @param id
   * @returns {*}
   */
  getMetadata(id) {
    return super.get(id);
  }

  /**
   * Generate a metadata set for a file prior to store it
   * @param metas
   * @returns {*}
   * @private
   */
  _createMetadata (metas) {
    const
      filePath = path.join(
        path.resolve(this.fileStorage.path),
        metas.displayName
      ),
      metadata = {
        displayName: metas.displayName,
        mimeType: metas.mimeType,
        uploadedAt: moment().unix(),
        uploadedBy: metas.userId || metas.uploadedBy || null,
        location: filePath,
        description: metas.description || null,
        type: metas.type || 'misc',
        shared: metas.shared || false
      };

    if (path.extname(metadata.displayName) === '') {
      metadata.displayName += '.' + mime.extension(metadata.mimeType);
    }

    return Bluebird.resolve(metadata);
  }

  /**
   * retrieve then set a file from a given url
   * @param id
   * @param url
   * @param metas
   * @param useProxy
   * @returns {*}
   */
  setFromUrl (id, url, metas = {}, useProxy = false) {
    let metadata;
    return this._createMetadata(metas)
      .then(meta => {
        metadata = meta;
        if (useProxy) {
          return this.yggdrasil.proxy.get(url);
        }
        return request({
          method: 'GET',
          uri: url,
          resolveWithFullResponse: true,
          simple: false,
          encoding: null
        })
          .then(response => {
            return Bluebird.resolve(response.body);
          });
      })
      .then(response =>{
        return this._set(id, metadata, response)
          .then(() => {
            metadata._id = id;
            return Bluebird.resolve({
              metadata: metadata,
              fileUrl: this.backendUrl + '/fs/' + metadata.displayName // TODO generate an url where rights are checked
            });
          });
      });
  }

  /**
   * Set a file from a buffer
   * @param id
   * @param buffer
   * @param metas
   * @returns {*}
   */
  setFromBuffer (id, buffer = new Buffer(), metas = {}) {
    return this._createMetadata(metas)
      .then(metadata => {
        return this._set(id, metadata, buffer)
          .then(() => {
            metadata._id = id;
            return Bluebird.resolve({
              metadata: metadata,
              fileUrl: this.backendUrl + '/fs/' + metadata.displayName // TODO generate an url where rights are checked
            });
          });
      });
  }

  /**
   * Set a file from a raw string
   * @param id
   * @param string
   * @param metas
   * @param encoding
   * @returns {*}
   */
  setFromString (id, string, metas = {}, encoding = 'utf8') {
    return this._createMetadata(metas)
      .then(metadata => {
        return this._set(id, metadata, string, {encoding: encoding})
          .then(() => {
            metadata._id = id;
            return Bluebird.resolve({
              metadata: metadata,
              fileUrl: this.backendUrl + '/fs/' + metadata.displayName // TODO generate an url where rights are checked
            });
          });
      });
  }

  /**
   * Set a file from a base 64 string
   * @param id
   * @param base64
   * @param metas
   * @returns {*}
   */
  setFromBase64 (id, base64, metas = {}) {
    return this._createMetadata(metas)
      .then(metadata => {
        return this._set(id, metadata, base64, {encoding: 'base64'})
          .then(() => {
            metadata._id = id;
            return Bluebird.resolve({
              metadata: metadata,
              fileUrl: this.backendUrl + '/fs/' + metadata.displayName // TODO generate an url where rights are checked
            });
          });
      });
  }

  /**
   * Set a file from a stream
   * @param id
   * @param stream
   * @param metas
   * @returns {*}
   */
  setFromStream (id, stream, metas = {}) {
    return this._createMetadata(metas)
      .then(metadata => {
        return this._set(id, metadata, stream, {isStream: true})
          .then(() => {
            metadata._id = id;
            return Bluebird.resolve({
              metadata: metadata,
              fileUrl: this.backendUrl + '/fs/' + metadata.displayName // TODO generate an url where rights are checked
            });
          });
      });
  }

  /**
   * Set a fine from local filesystem directly
   * @param id
   * @param path
   * @param metas
   * @returns {*}
   */
  setFromLocalFile (id, metas = {}) {
    return this._createMetadata(metas)
      .then(metadata => {
        return super.set(metadata, id)
          .then(() => {
            metadata._id = id;
            return Bluebird.resolve({
              metadata: metadata,
              fileUrl: this.backendUrl + '/fs/' + metadata.displayName // TODO generate an url where rights are checked
            });
          });
      });
  }

  /**
   * used in internal use only
   * @param id
   * @param metadata
   * @param input
   * @param options
   * @returns {*}
   * @private
   */
  _set(id, metadata, input, options = {}) {
    return new Bluebird((resolve, reject) => {
      let wsOptions = {};
      if (options.encoding) {
        wsOptions.encoding = options.encoding;
      }
      let ws = fs.createWriteStream(metadata.location, wsOptions);
      ws.on('finish', resolve);
      ws.on('error', reject);
      if (options.isStream) {
        input.pipe(ws);
      } else {
        ws.write(input);
        ws.end();
      }
    })
      .then(() => super.set(metadata, id));
  }

  /**
   * Overrides the ancestors set method
   * @param body
   * @param id
   * @param fileUrl
   * @param fileContent
   * @param isBase64
   * @param useProxy
   * @returns {*}
   */
  set(body, id, fileUrl = '', fileContent = '', isBase64 = false, useProxy = false) {
    const
      file = body.file || {},
      filePath = path.join(
        path.resolve(this.fileStorage.path),
        body.displayName
      ),
      metadata = {
        displayName: body.displayName,
        mimeType: body.mimeType || file.mimetype,
        uploadedAt: moment().unix(),
        uploadedBy: body.userId || null,
        location: filePath,
        description: body.description || null,
        type: body.type || 'misc'
      };

    if (path.extname(metadata.displayName) === '') {
      metadata.displayName += '.' + mime.extension(metadata.mimeType);
    }

    fileUrl = fileUrl || '';
    fileContent = fileContent || '';

    return Bluebird.resolve()
      .then(() => {

        if (fileUrl !== '') {
          let options = {
            method: 'GET',
            uri: fileUrl,
            resolveWithFullResponse: true,
            simple: false,
            encoding: null
          };
          if (useProxy) {
            let proxyList = []; // todo loaded from config file
            options.proxy = proxyList[Math.floor(Math.random() * Math.floor(proxyList.length))]; // pick a proxy randomly from list
          }

          return request(options)
            .catch(err => {
              throw err;
            })
            .then(response => {
              if (response.statusCode !== 200) {
                if (response.statusCode === 503) {
                  return Bluebird.delay(5000)
                    .then(() => request(options));
                }
                if (response.statusCode === 407 && options.proxy) { // proxy failure, use direct connection
                  delete options.proxy;
                  this.yggdrasil.logger.error('Retrieve file from url', fileUrl, 'with direct connection, proxy deactivated');
                  return request(options);
                }
                return Bluebird.reject(new Error (response.statusCode));
              }
              return Bluebird.resolve(response);
            })
            .then(response => {
              return writeFile(filePath, response.body);
            });
        }
        if (isBase64 && fileContent !== '') {
          // fileContent is base64
          return writeFile(filePath, fileContent, 'base64');
        }
        if (fileContent !== '') {
          //fileContent is a Buffer
          return writeFile(filePath, fileContent);
        }
        return Bluebird.reject(new Error('No content provided for file '+ body.displayName));
      })
      .then(() => {
        return super.set(metadata, id);
      });
  }

  /**
   * Delete the document and ots metadata
   * @param id
   * @returns {*}
   */
  delete(id) {
    return super.get(id)
      .then(metadata => {
        return unlink(metadata.body.location);
      })
      .catch(error => {
        if (error.code === 'ENOENT' && error.syscall === 'unlink') {
          // this is not the file you are looking for...
          // move along
          return Bluebird.resolve();
        }
      })
      .then(() => {
        return super.delete(id);
      });
  }

  updateMetas (metas) {
    let id;
    metas = metas.metadata || metas;
    id = metas._id;

    return super.get(id)
      .then(metadata => {
        metadata.description = metas.description || metadata.description;
        metadata.type = metas.type || metadata.type;
        metadata.shared = metas.shared || metadata.shared;
        return super.set(metadata, id);
      });
  }
  /**
   * (un)share a document. A document is shared depending on the context it is used.
   * If a document is attached to a project, it can be shared to the customer
   * If a document is related to a business provider, this document can be shared with this user
   * @param id
   * @param isShared
   */
  setShared (id, isShared) {
    return super.get(id)
      .then(metadata => {
        metadata.shared = isShared;
        return super.set(metadata, id);
      });
  }
}

module.exports = FilesRepository;
