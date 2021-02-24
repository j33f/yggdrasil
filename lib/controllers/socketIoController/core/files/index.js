'use strict';
const
  Bluebird = require('bluebird'),
  { castArray} = require('lodash');

module.exports = [
  /**
   * get metadata for file or files
   */
  {
    event: 'files/getMetas',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      let promises = [];

      if (!data.documents) {
        return [];
      }
      if(castArray(data.documents).length === 0) {
        return [];
      }
      castArray(data.documents).forEach(documentId => {
        promises.push(yggdrasil.repositories.files.get(documentId));
      });
      fn(await Bluebird.all(promises));
    }
  },
  /**
   * set the shared property of a file to shared
   */
  {
    event: 'files/share',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.repositories.files.setShared(data.documentId, true));
    }
  },
  /**
   * set the shared property of a file to not shared
   */
  {
    event: 'files/unShare',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.repositories.files.setShared(data.documentId, false));
    }
  },
  /**
   * set the shared property of a file to not shared
   */
  {
    event: 'files/updateMetas',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.repositories.files.updateMetas(data));
    }
  }
];