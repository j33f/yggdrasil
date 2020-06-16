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
    cb: (socket, yggdrasil, session, user, data, fn) => {
      let promises = [];

      if (!data.documents) {
        return Bluebird.resolve([]);
      }
      if(castArray(data.documents).length === 0) {
        return Bluebird.resolve([]);
      }
      castArray(data.documents).forEach(documentId => {
        promises.push(yggdrasil.repositories.files.get(documentId));
      });
      return Bluebird.all(promises)
        .then(response => {
          fn(response);
        });
    }
  },
  /**
   * set the shared property of a file to shared
   */
  {
    event: 'files/share',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.repositories.files.setShared(data.documentId, true)
        .then(response => {
          fn(response);
        });
    }
  },
  /**
   * set the shared property of a file to not shared
   */
  {
    event: 'files/unShare',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.repositories.files.setShared(data.documentId, false)
        .then(response => {
          fn(response);
        });
    }
  },
  /**
   * set the shared property of a file to not shared
   */
  {
    event: 'files/updateMetas',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.repositories.files.updateMetas(data)
        .then(response => {
          fn(response);
        });
    }
  }

];