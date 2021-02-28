'use strict';

const
  path = require('path'),
  express = require('express');

module.exports = async (yggdrasil) => {
  /**
   * Configure Express: Router: Static Files
   */
  // instantiate routes for common static files
  yggdrasil.use('/public', express.static(path.join(yggdrasil.rootPath, 'public')));
  yggdrasil.logger.info(`🔧  Will serve static files from${path.join(yggdrasil.rootPath, 'public')} as /public`);
};