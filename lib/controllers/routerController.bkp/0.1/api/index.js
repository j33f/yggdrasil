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
  res.status(404).json({
    status: 404,
    message: 'Nothing to see here'
  });
});

router.use('/auth', require('./auth'));
router.use('/users', require('./users'));
router.use('/fileUpload', require('./fileUpload'));
router.use('/files', require('./getFiles'));

module.exports = router;