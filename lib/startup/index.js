'use strict';

const
  startFunctionalTestingServer = require('./functionalTestingHelpers'),
  startServer = require('./server/start');

async function startup(yggdrasil) {
  yggdrasil.startup = {
    startServer: async (config) => {
      return await startServer(yggdrasil, config);
    },
    startFunctionalTestingServer: async (fixtures, config) => {
      return await startFunctionalTestingServer(yggdrasil, fixtures, config);
    }
  };
}

module.exports = startup;