'use strict';

const winston = require('winston');

/**
 * Instantiate core services
 */
/** Load the config **/

async function instantiate (yggdrasil, config) {
  console.time('time: ⏲  Pre-startup took');
  console.time('time: ⏲  Load config took');
  yggdrasil.loadConfig(config);
  console.timeEnd('time: ⏲  Load config took');

  /** Instantiate and configure the logger **/
  const loggerLevels = {
    crit: 0,
    'http-crit':0,
    'socketio-crit':0,
    error: 0,
    'http-error':0,
    'socketio-error':0,
    warn: 1,
    'http-warn':1,
    info: 2,
    'http-info':2,
    socketio: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  };
  const loggerLevelsColors = {
    crit: 'magenta',
    'http-crit': 'magenta',
    'socketio-crit': 'magenta',
    error: 'red',
    'http-error': 'red',
    'socketio-error': 'red',
    warn: 'yellow',
    'http-warn': 'yellow',
    info: 'blue',
    'http-info': 'blue',
    socketio: 'blue',
    http: 'cyan',
    verbose: 'white',
    debug: 'white',
    silly: 'gray'
  };
  winston.addColors(loggerLevelsColors);
  yggdrasil.logger = winston.createLogger({
    levels: loggerLevels,
    level: yggdrasil.config.logger.level || 'silly'
  });

  if (process.env.NODE_ENV !== 'production') {
    yggdrasil.logger.add(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }));
  } else {
    // app errors
    yggdrasil.logger.add(new winston.transports.File({
      filename: 'error.log',
      level: 'error',
      format: winston.format.json()
    }));
    yggdrasil.logger.add(new winston.transports.File({
      filename: 'warning.log',
      level: 'warning',
      format: winston.format.json()
    }));
    yggdrasil.logger.add(new winston.transports.File({
      filename: 'info.log',
      level: 'info',
      format: winston.format.json()
    }));
    // http errors
    yggdrasil.logger.add(new winston.transports.File({
      filename: 'http-error.log',
      level: 'http-crit',
      format: winston.format.json()
    }));
    yggdrasil.logger.add(new winston.transports.File({
      filename: 'http-error.log',
      level: 'http-error',
      format: winston.format.json()
    }));
    yggdrasil.logger.add(new winston.transports.File({
      filename: 'http-warning.log',
      level: 'http-warning',
      format: winston.format.json()
    }));
    yggdrasil.logger.add(new winston.transports.File({
      filename: 'http-info.log',
      level: 'http-info',
      format: winston.format.json()
    }));
    //socketio
    yggdrasil.logger.add(new winston.transports.File({
      filename: 'socketio.log',
      level: 'socketio',
      format: winston.format.json()
    }));
  }


  /** Prepares the yggdrasil to be served if needed **/
  yggdrasil.server = {};

  /** Adds events capabilities to the yggdrasil **/
  yggdrasil.events = new yggdrasil.lib.controllers.events(yggdrasil); // adds some methods to yggdrasil as shortcuts: see controller

  /** Define storage providers **/
  console.time('time: ⏲  Defining Storages took');
  yggdrasil.storage = {
    mongo: new yggdrasil.lib.drivers.mongo(yggdrasil, yggdrasil.config.mongo),
    redis: new yggdrasil.lib.drivers.redis(yggdrasil, yggdrasil.config.redis),
    isConnected: false
  };
  console.timeEnd('time: ⏲  Defining Storages took');

  yggdrasil.logger.info('⚡ New yggdrasil ready to be instantiated...');
  console.timeEnd('time: ⏲  Pre-startup took');

  console.time('time: ⏲  yggdrasil instantiation took');
  try {
    await yggdrasil.storage.mongo.connect();
    await yggdrasil.storage.redis.connect();
  } catch (e) {
    yggdrasil.logger.error('☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠');
    yggdrasil.logger.error('☠  Fatal: Error when connecting to the storage providers! Terminating.  ☠');
    yggdrasil.logger.error('☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠ ☠');
    throw e;
  }

  yggdrasil.storage.isConnected = true;
  yggdrasil.storageService = new yggdrasil.lib.services.storage(yggdrasil);

  console.time('time: ⏲  Repositories instantiation took');
  yggdrasil.repositories = new yggdrasil.lib.businessObjects.repositories(yggdrasil);
  console.timeEnd('time: ⏲  Repositories instantiation took');

  yggdrasil.fire('startup/core');
  console.timeEnd('time: ⏲  yggdrasil instantiation took');
}

module.exports = instantiate;