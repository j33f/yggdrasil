'use strict';

const
  base = require('./base'),
  CORS = require('./cors'),
  JWT = require('./jwt'),
  router = require('./router');

module.exports = async (yggdrasil) => {
  yggdrasil.fire('log', 'info', '🚦  Instantiating Express...');

  await base(yggdrasil);
  await CORS(yggdrasil);
  await JWT(yggdrasil);
  await router(yggdrasil);
};