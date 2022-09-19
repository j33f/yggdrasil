'use strict';
const express = require('express');

let controller = {};

controller.router = express.Router();

controller.addRouter = (path, router, from, yggdrasil) => {
  yggdrasil.fire('log', 'info', `🚦  New HTTP API route added from "${from}": ${path}`);
  controller.router.use(path, router);
};

controller.getRouter = () => {
  return controller.router;
};

module.exports = controller;