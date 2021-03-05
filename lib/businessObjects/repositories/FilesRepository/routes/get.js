'use strict';

const express = require('express');
const router = express.Router();

router.get('/:type/:id', async (req, res) => {
  const {id, type} = req.params;

  try {
    const rawMetadata = await res.yggdrasil.repositories.files.get(id, ('nocache'));
    if (type === rawMetadata.body.type) {
      // send the requested file
      const file = res.yggdrasil.repositories.file.getFile(rawMetadata.body);
      res.setHeader('content-type', rawMetadata.body.mimeType);
      if (file.isStream) {
        file.content.pipe(res);
      }
      if (file.isLocation) {
        res.sendFile(file.content);
      }
      return true;
    }
    req.yggdrasil.fire('log', 'error', `Bad type, got ${type} but ${rawMetadata.body.type} was expected.`);
    res
      .status(404)
      .send('Not found.');
    return false;
  } catch (e) {
    req.yggdrasil.fire('log', 'error', `Bad file id ${id}`);
    res
      .status(404)
      .send('Not found.');
    return false;
  }
});

module.exports = router;
