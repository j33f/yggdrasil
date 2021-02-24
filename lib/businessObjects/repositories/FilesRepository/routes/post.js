'use strict';

const Bluebird = require('bluebird');
const path = require('path');
const express = require('express');
const router = express.Router();

/**
 * Store the file from a buffer
 * @param fileMetas
 * @param fileData
 * @param yggdrasil
 * @returns {*}
 */
const storeFile = (fileMetas, fileData, yggdrasil) => {
  return yggdrasil.repositories.files._setFromBuffer(
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
 * @param shared {boolean} is the file shared ?
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
const routePath = '/:objectType/:objectId/:fileType?/:shared?';
const routeCb = async (req, res) => {
  let attachmentIds = [];

  if (res.yggdrasil.repositories[req.params.objectType]) {
    const prepared = await prepareAndStore(req.files, res.yggdrasil, req.session.userId, req.params.fileType || 'misc');
    prepared.forEach(element => {
      attachmentIds.push(element.metadata._id);
    });
    const response = await res.yggdrasil.repositories[req.params.objectType].addAttachment(req.params.objectId, {attachmentIds: attachmentIds});
    res
      .status(201)
      .json({
        status: 201,
        documents: (response.body) ? response.body.documents : response.documents
      });
    return;
  }
  res.status(501).json({
    status: 501,
    message: 'Not iplemented',
    details: `The given object type ${res.params.objectType} does not exists. The attachment(s) cannot be attached to any object thus they have not been uploaded.`
  });
};

router.post(routePath, routeCb);
router.put(routePath, routeCb);

module.exports = router;
