'use strict';

let
  express = require('express'),
  router = express.Router();

router.use('/', require('./api'));

module.exports = router;
