'use strict';

const express = require('express');
const router = express.Router();
const commonResponses = require('./commonResponses');
const authController = require('../controller.js');

router.post('/login', async (req, res) => {
  try {
    const response = await authController.loginLocal(req.body, req.yggdrasil, req.secure);
    return commonResponses.ok(res, response);
  } catch (e) {
    return commonResponses.bad(res);
  }
});

router.get('/logout', async (req, res) => {
  try {
    await res.yggdrasil.lib.controllers.auth.logout(req.yggdrasil, req.session);
  } catch (e) {
    req.yggdrasil.fire('log', 'warn', 'Error during logout');
    console.error(e);
  }
  return res
    .clearCookie('Authorization')
    .status(200)
    .json({
      status: 200,
      message: 'Logout successful'
    });
});

router.get('/generatePassword', (req, res) => {
  res
    .status(201)
    .send(res.yggdrasil.lib.utils.generatePassword());
});

router.post('/passwordResetRequest', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  try {
    await res.yggdrasil.lib.controllers.users.credentials.passwordChangeRequest(req.yggdrasil, req.body.email, ip);
    res
      .status(201)
      .json({});
  } catch(e) {
    res.yggdrasil.fire('log', 'error', 'Error during passwordResetRequest', e);
    res
      .status(404)
      .json({});
  }
});

router.post('/passwordReset', async (req, res) => {
  if (req.body.passwordConfirm.trim() === '' || req.body.password.trim() === '' || req.body.email.trim() === '') {
    res
      .status(401)
      .json({});
    return;
  }

  try {
    await res.yggdrasil.lib.controllers.users.credentials.resetPasswordWithKey(req.yggdrasil, req.body);
    res
      .status(201)
      .json({});
  } catch(e) {
    res.yggdrasil.fire('log', 'error', 'Error during passwordReset', e);
    res
      .status(401)
      .json({});
  }
});

module.exports = router;
