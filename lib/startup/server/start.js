'use strict';

const
  coreInstantiate = require('./coreInstantiate'),
  express = require('./express'),
  httpServer = require('./httpServer'),
  mailTransport = require('./mailTransport'),
  sessions = require('./sessions'),
  socketIOServer = require('./socketIOServer');

async function startServer (yggdrasil, config) {
  let
    serverStarted = false,
    sendmailReached = false;

  /** Start The yggdrasil ! **/
  console.log('into:', '☘  Instantiating the core components in server mode...');
  console.time('time: ⏲  Starting Server took');
  try {
    await coreInstantiate(yggdrasil, config);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }

  /** Define the domain and ports **/
  yggdrasil.server.domain = process.env.DOMAIN || 'localhost';
  yggdrasil.logger.info('⚙  Configured domain is', yggdrasil.server.domain);

  if (yggdrasil.server.domain !== 'localhost') {
    yggdrasil.server.protocol = 'https';
    yggdrasil.server.frontPort = '443';
  } else {
    yggdrasil.server.protocol = 'http';
    yggdrasil.server.frontPort = '3000';
  }

  yggdrasil.server.port = yggdrasil.lib.utils.network.normalizePort(process.env.PORT || yggdrasil.config.port || 443);
  yggdrasil.logger.info('⚙  Configured port is', yggdrasil.server.port);

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
      console.timeEnd('time: ⏲  Starting Server took');
      yggdrasil.logger.info(' \n\n\n' +
        '   __  __                         __   ____                    _             __\n' +
        '  / / / /___     ____ _____  ____/ /  / __ \\__  ______  ____  (_)___  ____ _/ /\n' +
        ' / / / / __ \\   / __ `/ __ \\/ __  /  / /_/ / / / / __ \\/ __ \\/ / __ \\/ __ `/ / \n' +
        '/ /_/ / /_/ /  / /_/ / / / / /_/ /  / _, _/ /_/ / / / / / / / / / / / /_/ /_/  \n' +
        '\\____/ .___/   \\__,_/_/ /_/\\__,_/  /_/ |_|\\__,_/_/ /_/_/ /_/_/_/ /_/\\__, (_)   \n' +
        '    /_/                                                            /____/      \n\n\n'+
        '_______________________________________________________________________________\n');
      yggdrasil.stopListening('startup/somethingOk');
    }
  });

  try {
    await mailTransport(yggdrasil);
    await sessions(yggdrasil);
    await express(yggdrasil);
    await httpServer(yggdrasil);
    await socketIOServer(yggdrasil);
  } catch(e) {
    yggdrasil.logger.error('☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠');
    yggdrasil.logger.error('☠  Fatal: Error when starting the server!                 Terminating.  ☠');
    yggdrasil.logger.error('☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠');
    console.error(e);
    process.exit(1);
  }

  yggdrasil.logger.info('☘  Everything have been instantiated, awaiting for the last things to be ready...');
  return yggdrasil;
}

module.exports = startServer;