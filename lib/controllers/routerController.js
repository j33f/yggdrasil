'use strict';
const express = require('express');

let controller = {};

controller.router = express.Router();

controller.addRoute = (path, router, from, yggdrasil) => {
  yggdrasil.logger.info(`🚦  New HTTP API route added from "${from}": ${path}`);
  controller.router.use(path, router);
};

controller.getRouter = () => {
  return controller.router;
};

module.exports = controller;