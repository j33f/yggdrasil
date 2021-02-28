'use strict';

const { readFileSync } = require('fs');

async function spawnHttpServer (yggdrasil) {
  yggdrasil.logger.info('🚦  Spawning the HTTP server...');
  console.time('time: ⏱   HTTP Server spawning took ');

  const httpServerHandlers = require('./httpServerHandlers')(yggdrasil);

  let http, server, options;

  if (yggdrasil.server.domain === 'localhost') {
    yggdrasil.logger.info('🔓  Serving from localhost: no security');

    http = require('http');
    server = http.createServer(yggdrasil);
  } else {
    yggdrasil.logger.info('🔐  Not serving from localhost: https is used');

    if (yggdrasil.config.serverCertificate) {
      options = {
        key: yggdrasil.config.serverCertificate.key,
        cert: yggdrasil.config.serverCertificate.cert,
        ca: yggdrasil.config.serverCertificate.ca
      };
    } else {
      options = {
        key: readFileSync('/etc/letsencrypt/live/' + yggdrasil.server.domain + '/privkey.pem'),
        cert: readFileSync('/etc/letsencrypt/live/' + yggdrasil.server.domain + '/cert.pem'),
        ca: readFileSync('/etc/letsencrypt/live/' + yggdrasil.server.domain + '/chain.pem')
      };
    }
    http = require('https');
    server = http.createServer(options, yggdrasil);
  }
  server.listen(yggdrasil.server.port);
  server.on('error', httpServerHandlers.onError);
  server.on('listening', httpServerHandlers.onListening);

  yggdrasil.server.serverObject = server;
}

module.exports = spawnHttpServer;