'use strict';

const coreInstantiate = require('./coreInstantiate');
const express = require('./express');
const httpServer = require('./httpServer');
const mailTransport = require('./mailTransport');
const sessions = require('./sessions');
const socketIOServer = require('./socketIOServer');

async function startServer (yggdrasil, config) {
  let serverStarted = false;
  let sendmailReached = false;

  /** Start The yggdrasil ! **/
  console.log('info:', '🥑  Instantiating the core components in server mode...');
  console.time('time: ⏱   Instantiating the core components in server mode took');
  try {
    await coreInstantiate(yggdrasil, config);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }

  /** Define the domain and ports **/
  yggdrasil.server.domain = process.env.DOMAIN || 'localhost';
  yggdrasil.fire('log', 'info', `🔧  Configured domain is ${yggdrasil.server.domain}`);

  if (yggdrasil.server.domain !== 'localhost') {
    yggdrasil.server.protocol = 'https';
    yggdrasil.server.frontPort = '443';
  } else {
    yggdrasil.server.protocol = 'http';
    yggdrasil.server.frontPort = '3000';
  }

  yggdrasil.server.port = yggdrasil.lib.utils.network.normalizePort(process.env.PORT || yggdrasil.config.port || 443);
  yggdrasil.fire('log', 'info', `🔧  Configured port is ${yggdrasil.server.port}`);

  /** Set the env mode **/
  yggdrasil.set('env', process.env.ENV || 'development');

  /** Listen o events to know when the server is really started **/
  yggdrasil.listenOnce('startup/core/sendmail', () => {
    sendmailReached = true;
    yggdrasil.fire('startup/somethingOk');
  });
  yggdrasil.listenOnce('startup/server/HTTP', () => {
    serverStarted = true;
    yggdrasil.fire('startup/somethingOk');
  });

  yggdrasil.listen('startup/somethingOk', () => {
    if (serverStarted && sendmailReached) {
      console.timeEnd('time: ⏱   Instantiating the core components in server mode took');
      const end = process.hrtime(yggdrasil._startedAt.hr);
      yggdrasil._upSince = Date.now();
      console.log('time: ⏱   Starting Yggdrasil took ' + end[0] + 's' + Math.round(end[1] / 1000000) + 'ms');
      yggdrasil.fire('log', 'info', '🤘  Yggdrasil is up and running !');
      yggdrasil.stopListening('startup/somethingOk');
    }
  });

  try {
    sessions(yggdrasil);
    await mailTransport(yggdrasil);
    await express(yggdrasil);
    await httpServer(yggdrasil);
    await socketIOServer(yggdrasil);
  } catch(e) {
    yggdrasil.fire('log', 'error', '☠️☠️☠️☠️☠️☠️☠️☠️️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️');
    yggdrasil.fire('log', 'error', ' ️         Fatal: Error when starting the server! Terminating.️');
    yggdrasil.fire('log', 'error', '☠️☠️☠️☠️☠️☠️☠️☠️️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️');
    console.error(e);
    process.exit(1);
  }

  yggdrasil.fire('log', 'info', '🤞  Everything have been instantiated, awaiting for the last things to be ready...');
  return yggdrasil;
}

module.exports = startServer;