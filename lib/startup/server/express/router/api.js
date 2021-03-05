'use strict';

async function API (yggdrasil) {
  /**
   * Configure Express: Router: API
   */
  const rootDefaultResponse = (req, res) => {
    const response= {
      server: {
        version: 'α',
        lastCommit: yggdrasil.lib.utils.git.getLastCommit(),
        currentTime: new Date().toISOString()
      },
      api: {
        version: yggdrasil.config.api.version,
        rootPath: '/api'
      },
      routes: yggdrasil.lib.utils.getRoutes(yggdrasil)
    };

    res
      .status(200)
      .json(response);
  };

  yggdrasil.options('/', rootDefaultResponse);
  yggdrasil.get('/', rootDefaultResponse);
  yggdrasil.use('/api', yggdrasil.lib.controllers.router.getRouter());
  yggdrasil.fire('log', 'info', '🔧  Will serve the API from /api');
}

module.exports = API;