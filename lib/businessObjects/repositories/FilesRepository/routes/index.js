'use strict';

const express = require('express');
const router = express.Router();

router.use(require('./get'));
router.use(require('./post'));

module.exports = router;