async function CORS (yggdrasil) {
  /**
   * Configure Express: CORS
   */
  // middleware to manage CORS
  yggdrasil.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': req.headers.origin || req.yggdrasil.config.allowOrigins.join(','), // dynamic cors allow origin, do not put * here see https://stackoverflow.com/a/42062978
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control'
    });
    next();
  });
}

module.exports = CORS;