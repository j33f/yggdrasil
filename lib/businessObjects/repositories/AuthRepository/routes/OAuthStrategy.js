'use strict';

const express = require('express');
const router = express.Router();
const commonResponses = require('./commonResponses');
const authController = require('../controller');

/**
 * Get the strategy from the request
 * @param request
 * @returns {*}
 */
const getStrategy = (request) => {
  return request.yggdrasil.OAuthStrategies[request.params.strategy.toLowerCase()];
};

/**
 * Check if strategy is available
 * @param req
 * @param res
 * @param strategy
 * @returns {boolean}
 */
const checkStrategy = (req, res, strategy) => {
  if (!strategy) {
    // the strategy is not implemented yet
    commonResponses.OAuthNotImplemented(res);
    req.yggdrasil.fire('log', 'warn', `The "${req.params.strategy}" OAuth strategy is not implemented (been accessed)`);
    return false;
  }
  if (!req.yggdrasil.config.OAuth || !req.yggdrasil.config.OAuth[strategy.name]) {
    commonResponses.OAuthNotImplemented(res);
    req.yggdrasil.fire('log', 'warn', `The "${req.params.strategy}" OAuth strategy is implementend but not configured (been accessed)`);
    return false;
  }
  if (!strategy.initialized) {
    // initialize the strategy on the fly if it is not done yet
    req.yggdrasil.fire('log', 'info', `Initialize OAuth strategy: ${strategy.name}...`);
    strategy.init();
  }
  return true;
};

router.get('/login/:strategy', (req, res) => {
  const strategy = getStrategy(req);
  if (checkStrategy(req, res, strategy)) {
    strategy.authenticate(req, res);
  }
});

router.get('/login/:strategy/callback', (req, res) => {
  const strategy = getStrategy(req);
  const session = req.yggdrasil.sessionsService.getSession(req);

  if (!checkStrategy(req, res, strategy)) {
    return;
  }

  try {
    strategy.authenticate(req, res, async (wholeProfile) => {
      if (wholeProfile) {
        // only store the id into auth profile
        const profile = (({ id, provider }) => ({ id, provider }))(wholeProfile);
        if (session) {
          // There is an active session, try to add this OAuth profile to the corresponding user
          return authController.addProfileToUser(req, res, session, profile);
        }

        // there is no active session: try to use the OAuth profile to log a user in
        try {
          const response = await authController.loginOAuth(profile, req.yggdrasil, req.secure);
          return commonResponses.ok(res, response, true);
        } catch (e) {
          return commonResponses.bad(res, true);
        }
      }
      return res
        .status(500)
        .json({
          status: 500,
          message: 'Internal Server Error',
          details: 'No profile retrieved... check logs.'
        });

    });
  } catch (e) {
    res
      .status(500)
      .json({
        status: 500,
        message: 'Internal Server Error',
        details: e.message
      });
    throw e;
  }
});

module.exports = router;