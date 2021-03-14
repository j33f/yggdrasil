'use strict';

const
  express = require('express'),
  router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const response = await res.yggdrasil.lib.controllers.auth.login(req.body, req.yggdrasil, req.secure);

    res
      .cookie('Authorization', 'Bearer ' + response.bearer, response.authCookieOptions)
      .set('Authorization', 'Bearer ' + response.bearer, response.authCookieOptions)
      .status(200)
      .json({
        user: response.session.user,
        jwt: response.bearer
      });
  } catch (e) {
    res
      .status(403)
      .json({
        status: 403,
        message: 'Bad Credentials'
      });
  }
});

router.get('/logout', (req, res) => {
  const session = req.yggdrasil.sessionsService.decodeJWT(req.yggdrasil.sessionsService.getJWT(req));

  if (res.yggdrasil.socketIoController) {
    res.yggdrasil.socketIoController.broadcast('logout/' + session.userId, null);
    res.yggdrasil.socketIoController.broadcast('logout', session.userId);
  }

  return res.yggdrasil.lib.controllers.auth.logout(req.yggdrasil, session)
    .then(() => {
      return res
        .clearCookie('Authorization')
        .status(200)
        .json({});
    });
});

router.get('/generatePassword', (req, res) => {
  res
    .status(201)
    .send(res.yggdrasil.lib.utils.generatePassword());
});

router.post('/passwordResetRequest', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  return res.yggdrasil.lib.controllers.users.credentials.passwordChangeRequest(req.yggdrasil, req.body.email, ip)
    .then(() => {
      res
        .status(201)
        .json({});
    })
    .catch(() => {
      res
        .status(404)
        .json({});
    });
});

router.post('/passwordReset', (req, res) => {
  if (req.body.passwordConfirm.trim() === '' || req.body.password.trim() === '' || req.body.email.trim() === '') {
    res
      .status(401)
      .json({});
    return;
  }

  return res.yggdrasil.lib.controllers.users.credentials.resetPasswordWithKey(req.yggdrasil, req.body)
    .then(() => {
      res
        .status(201)
        .json({});
    })
    .catch(() => {
      res
        .status(401)
        .json({});
    });
});

module.exports = router;
