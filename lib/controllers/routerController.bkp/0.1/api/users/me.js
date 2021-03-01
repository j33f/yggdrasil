'use strict';

let
  express = require('express'),
  router = express.Router();

router.get('/isLoggedIn', (req, res) => {
  if (req.session.isLoggedIn === true) {
    res
      .status(200)
      .json({
        status: 200,
        response: true
      });
  } else {
    res
      .status(401)
      .json({
        status: 401,
        response: false
      });
  }
});

// /users/me route
router.get('/', (req, res) => {
  const user = new req.yggdrasil.lib.businessObjects.User(req.yggdrasil, req.session.userId);
  user.get();

  res.yggdrasil.lib.controllers.users.me(req.yggdrasil, user)
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
