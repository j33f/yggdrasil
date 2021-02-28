'use strict';
const express = require('express');
const router = express.Router();

const getMethods = ['get', 'list', 'search', 'walk', 'getDistinct'];
const deleteMethods = ['delete'];

const factory = (yggdrasil, repository) => {
  router.post(`/${repository.name.toLowerCase()}`, (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].create(req.yggdrasil, req.session.userId, req.body)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post(`/${repository.name.toLowerCase()}/:id`, (req, res) => {
    const data = {
      id: req.params.id,
      ...req.body
    };
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].update(req.yggdrasil, req.session.userId, data)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.delete(`/${repository.name.toLowerCase()}/:id`, (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].delete(req.yggdrasil, req.session.userId, req.params.id)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.get(`/${repository.name.toLowerCase()}/:id`, (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].get(req.yggdrasil, req.session.userId, req.params.id)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post(`/${repository.name.toLowerCase()}/list`, (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].list(req.yggdrasil, req.session.userId, req.params.query)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post(`/${repository.name.toLowerCase()}/search`, (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].search(req.yggdrasil, req.session.userId, req.params.query)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post(`/${repository.name.toLowerCase()}/walk`, (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].walk(req.yggdrasil, req.session.userId, req.params.query)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post(`/${repository.name.toLowerCase()}/getDistinct`, (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].getDistinct(req.yggdrasil, req.session.userId, req.params.query)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  return router;
};

module.exports = factory;