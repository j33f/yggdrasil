'use strict';

const express = require('express');
const router = express.Router();

// /users/me route
router.get('/', (req, res) => {
  res.yggdrasil.lib.controllers.users.me(req.yggdrasil, req.session.userId)
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
