'use strict';

const io = require('socket.io-client');

let api = {};

api.getSocket = (server, token) => {
  let options = {
    forceNew: true
  };

  if (token) {
    options.query = 'token=' + token;
  }

  server = server || 'http://localhost:8843';
  return io(server, options);
};

module.exports = api;