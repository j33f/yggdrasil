'use strict';
const express = require('express');
const router = express.Router();

const factory = (yggdrasil, repository) => {
  router.post('/', (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].create(req.yggdrasil, req.session, req.body)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post('/:id', (req, res) => {
    const data = {
      id: req.params.id,
      ...req.body
    };
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].update(req.yggdrasil, req.session, data)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.delete('/:id', (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].delete(req.yggdrasil, req.session, req.params.id)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.get('/:id', (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].get(req.yggdrasil, req.session, req.params.id)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post('/list', (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].list(req.yggdrasil, req.session, req.params.query)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post('/search', (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].search(req.yggdrasil, req.session, req.params.query)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post('/walk', (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].walk(req.yggdrasil, req.session, req.params.query)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  router.post('/getDistinct', (req, res) => {
    return req.yggdrasil.lib.controllers[repository.name.toLowerCase()].getDistinct(req.yggdrasil, req.session, req.params.query)
      .then(response => {
        return res
          .status(response.status)
          .json(response);
      });
  });

  return router;
};

module.exports = factory;