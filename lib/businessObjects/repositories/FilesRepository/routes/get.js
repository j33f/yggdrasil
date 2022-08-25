'use strict';

const express = require('express');
const router = express.Router();

const handler = async (req, res) => {
  const {id, type} = req.params;

  try {
    const rawMetadata = await res.yggdrasil.repositories.files.get(id, ('noCache'));
    if (type === rawMetadata.body.type) {
      // send the requested file
      const file = res.yggdrasil.repositories.files.getFile(rawMetadata.body);
      res
        .setHeader('content-type', rawMetadata.body.mimeType)
        .status(200);

      if (file.isStream) {
        file.content.pipe(res);
      }
      if (file.isLocation) {
        res.sendFile(file.content);
      }
      return;
    }

    req.yggdrasil.fire('log', 'error', `Bad type, got ${type} but ${rawMetadata.body.type} was expected.`);
    res
      .status(404)
      .send('Not Found');
  } catch (e) {
    req.yggdrasil.fire('log', 'error', `Bad file id ${id}`);
    res
      .status(404)
      .send('Not Found');
  }
};

router.get('/:type/:id', handler);

module.exports = router;
