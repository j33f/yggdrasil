'use strict';

const
  express = require('express'),
  router = express.Router();

router.options('*', (req, res) => {
  res.status(200).json({
    status: 200
  });
});

router.get('/', (req, res) => {
  res.status(200).json({
    status: 200,
    message: 'Just an example route'
  });
});

module.exports = router;