'use strict';

let
  Bluebird = require('bluebird'),
  express = require('express'),
  path = require('path'),
  router = express.Router();

/**
 * Store the file from a buffer
 * @param fileMetas
 * @param fileData
 * @param yggdrasil
 * @returns {*}
 */
const storeFile = (fileMetas, fileData, yggdrasil) => {
  return yggdrasil.repositories.files.setFromBuffer(
    yggdrasil.uuid(true),
    fileData,
    fileMetas
  );
};

/**
 * Create a transitional object referring the received file and then store it to the files repository
 * @param files {object} raw objectcontaining the representation of the received file
 * @param yggdrasil {object} the yggdrasil
 * @param userId {string} current user ID
 * @param type {string} a file type
 * @returns {Promise<object>}
 */
const prepareAndStore = (files, yggdrasil, userId, type, shared = false) => {
  let promises = [];

  Object.keys(files).forEach(id => {
    const file = files[id];
    const fileMetas = {
      displayName: yggdrasil.uuid(true) + path.extname(file.name),
      mimeType: file.mimetype,
      userId: userId,
      type: type,
      description: file.name,
      shared: (shared) // boolean cast
    };

    promises.push(storeFile(fileMetas, file.data, yggdrasil));
  });

  return Bluebird.all(promises);

};

/**
 * This route is generic and agnostic
 *
 * Url Parameters:
 * objectType: the parent object type (see repositories)
 * objectId: the object ID (the project Id for example)
 * documentType: optional = internal file type (lm-pdf, video, document...) anything relevant against objectType
 * shared: optional = if present a 'shared' file metadata will be set into true
 */
router.post('/:objectType/:objectId/:fileType?/:shared?', (req, res) => {
  return prepareAndStore(req.files, res.yggdrasil, req.session.user.id, req.params.fileType || 'misc')
    .then(response => {
      let attachmentIds = [];
      response.forEach(r => {
        attachmentIds.push(r.metadata._id);
      });
      return res.yggdrasil.lib.controllers.files.attachFileToObject(res.yggdrasil, req.session, req.session.user, {objectType: req.params.objectType, objectId: req.params.objectId, fileType: req.params.fileType || 'misc', attachmentIds: attachmentIds});
    })
    .then(response => {
      res
        .status(201)
        .json({
          status: 201,
          documents: (response.body) ? response.body.documents : response.documents
        });
    })
    .catch(e => {
      res.yggdrasil.logger.error(e);
      res.status(500).json({
        status: 500,
        error: e
      });
    });
});

module.exports = router;
