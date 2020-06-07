'use strict';

const
  express = require('express'),
  router = express.Router();

router.use('/', require('./api'));

module.exports = router;
