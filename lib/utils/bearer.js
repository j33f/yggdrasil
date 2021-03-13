'use strict';

const retrieveBearer = (req, res, next) => {
  req.bearer = req.get('Authorization');
  next();
};

const requireBearer = (req, res, next) => {
  if (
    (
      req.path !== '/' // root does not need a bearer
      && !req.path.startsWith('/auth') // auth does not need a bearer
    )
    && !(req.bearer) // no bearer found
    && req.method !== 'OPTIONS'
  ) {
    // bearer is required but not found
    res.status(401).json({
      status: 401,
      message: 'You must be authenticated to access this route.'
    });
  }
  next();
};

module.exports = {
  retrieve: retrieveBearer,
  require: requireBearer
};