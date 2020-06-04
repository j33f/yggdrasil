'use strict';

const
  Bluebird = require('bluebird'),
  express = require('express'),
  router = express.Router();

router.get('/:type/:id', (req, res) => {
  const {id, type} = req.params;
  return res.yggdrasil.repositories.files.getMetadata(id)
    .then(file => {
      if (type === file.body.type) {
        // send the requested file
        res.sendFile(file.body.location);
      } else {
        return Bluebird.reject(new Error('Bad type, got ' + type + ' but ' + file.body.type + ' was expected.'));
      }
    })
    .catch(err => {
      req.yggdrasil.logger.error(err.message + ' at ' + __filename);
      res
        .status(404)
        .send('Not found.');
    });
});

module.exports = router;
