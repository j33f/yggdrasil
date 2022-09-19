'use strict';

const express = require('express');
const router = express.Router();

router.use(require('./localStrategy'));
router.use(require('./OAuthStrategy'));

module.exports = router;