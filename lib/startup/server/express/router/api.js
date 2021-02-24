'use strict';

async function API (yggdrasil) {
  /**
   * Configure Express: Router: API
   */
  const rootDefaultResponse = {
    server: {
      version: 'α',
      lastCommit: yggdrasil.lib.utils.git.getLastCommit(),
      currentTime: new Date().toISOString()
    },
    api: {
      version: yggdrasil.config.api.version,
      rootPath: '/api'
    }
  };
  yggdrasil.options('/', (req, res) => {
    res
      .status(200)
      .json(rootDefaultResponse);
  });
  yggdrasil.get('/', (req, res) => {
    res
      .status(200)
      .json(rootDefaultResponse);
  });
  yggdrasil.use('/api', yggdrasil.lib.controllers.router.getRouter());
  yggdrasil.logger.info('⚙  Will serve the API from /api');
}

module.exports = API;