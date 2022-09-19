'use strict';

const express = require('express');
const router = express.Router();

const commonResponses = {
  ok: (res, result) => {
    return res
      .status(200)
      .json({
        status: 200,
        response: result
      });
  },
  unauthorized: (res) => {
    return res
      .status(401)
      .json({
        status: 401,
        message: 'Unauthorized'
      });
  }
};

router.get('/me', (req, res) => {
  return res.yggdrasil.lib.controllers.users.me(req.yggdrasil, req.session)
    .then(result => commonResponses.ok(res, result))
    .catch(() => commonResponses.unauthorized(res));
});

router.get('/:id', (req, res) => {
  return res.yggdrasil.lib.controllers.users.get(req.yggdrasil, req.session, req.params.id)
    .then(result => commonResponses.ok(res, result))
    .catch(() => commonResponses.unauthorized(res));
});

module.exports = router;
