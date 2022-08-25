'use strict';

const Bluebird = require('bluebird');
const {extname} = require('path');
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
  return yggdrasil.repositories.files.set(
    fileMetas,
    yggdrasil.uuid(true),
    null,
    fileData
  );
};

/**
 * Create a transitional object referring the received file and then store it to the files repository
 * @param files {object} raw object containing the representation of the received file
 * @param yggdrasil {object} the yggdrasil
 * @param userId {string} current user ID
 * @param type {string} a file type
 * @returns {Promise<object>}
 */
const prepareAndStore = (files, yggdrasil, userId, type) => {
  let promises = [];

  Object.keys(files).forEach(id => {
    const file = files[id];
    const fileMetas = {
      displayName: yggdrasil.uuid(true) + extname(file.name),
      mimeType: file.mimetype,
      userId: userId,
      type: type,
      description: file.name
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
const routePath = '/:objectType/:objectId/:fileType?';
const handler = async (req, res) => {
  let attachmentIds = [];
  const objectType = String(req.params.objectType).slice(0, 255);

  if (res.yggdrasil.repositories[objectType]) {
    try {
      const prepared = await prepareAndStore(req.files, res.yggdrasil, req.session.userId, req.params.fileType || 'misc');
      prepared.forEach(element => {
        attachmentIds.push(element.metadata._id);
      });
      const response = await res.yggdrasil.repositories[objectType].addAttachment(req.params.objectId, {attachmentIds: attachmentIds});
      res
        .status(201)
        .json({
          status: 201,
          documents: (response.body) ? response.body.documents : response.documents
        });
      return;
    } catch (e) {
      console.log(e);
      res
        .status(500)
        .json({
          status: 500,
          error: e.message
        });
      return;
    }
  }
  res
    .status(501)
    .json({
      status: 501,
      message: 'Not implemented',
      details: `The given object type ${req.params.objectType} does not exists. The attachment(s) cannot be attached to any object thus they have not been uploaded.`
    });
};

router.post(routePath, handler);
router.put(routePath, handler);

module.exports = router;
