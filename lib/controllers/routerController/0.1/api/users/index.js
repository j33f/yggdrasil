'use strict';

let
  express = require('express'),
  router = express.Router();


router.use('/me', require('./me'));

module.exports = router;
