'use strict';

const express = require('express');
const router = express.Router();

router.get('/:id', (req, res) => {
  res.yggdrasil.lib.controllers.users.get(req.yggdrasil, req.session, req.params.id)
    .then(result => {
      res
        .status(200)
        .json({
          status: 200,
          response: result
        });
    })
    .catch(() => {
      res
        .status(401)
        .json({
          status: 401,
          message: 'Unauthorized'
        });
    });
});

router.get('/me', (req, res) => {
  res.yggdrasil.lib.controllers.users.me(req.yggdrasil, req.session)
    .then(result => {
      res
        .status(200)
        .json({
          status: 200,
          response: result
        });
    })
    .catch(() => {
      res
        .status(401)
        .json({
          status: 401,
          message: 'Unauthorized'
        });
    });
});

module.exports = router;
