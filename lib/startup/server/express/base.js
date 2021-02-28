'use strict';
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const favicon = require('serve-favicon');
const fileUpload = require('express-fileupload');
const helmet = require('helmet/dist');
const httpLogger = require('express-winston').logger;
const path = require('path');

module.exports = async (yggdrasil) => {
  /**
   * Configure Express: base
   */
  // Base config
  const helmetConfig = {
    frameguard: {
      action: 'sameorigin'
    },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        styleSrc: ['\'self\'', ...yggdrasil.config.allowOrigins],
        upgradeInsecureRequests: [true]
      }
    }
  };

  yggdrasil.use(helmet(helmetConfig));

  const loggerLevels = (req, res) => {
    let level = '';
    if (res.statusCode >= 100) { level = "http-info"; }
    if (res.statusCode >= 400) { level = "http-warn"; }
    if (res.statusCode >= 500) { level = "http-error"; }
    if (res.statusCode == 401 || res.statusCode == 403) { level = "http-crit"; }
    return level;
  };

  if (process.env.NODE_ENV !== 'production') {
    yggdrasil.use(httpLogger({
      winstonInstance: yggdrasil.logger,
      msg: "HTTP {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
      expressFormat: false, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
      colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
      statusLevels: false, // default value
      level: loggerLevels,
      meta: false,
      metaField: null
    }));
  } else {
    yggdrasil.use(httpLogger({
      winstonInstance: yggdrasil.logger,
      msg: "HTTP {{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
      expressFormat: false, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
      colorize: false, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
      statusLevels: false, // default value
      level: loggerLevels,
      meta: true
    }));
  }

  yggdrasil.use(fileUpload());
  yggdrasil.use(bodyParser.urlencoded({ extended: false }));
  yggdrasil.use(bodyParser.json());
  yggdrasil.use(cookieParser(yggdrasil.config.JWTSecret));
  yggdrasil.use(favicon(path.join(yggdrasil.rootPath, 'public', 'favicon.ico')));

  yggdrasil.use((req, res, next) => {
    req.yggdrasil = yggdrasil;
    res.yggdrasil = yggdrasil;
    next();
  });
};