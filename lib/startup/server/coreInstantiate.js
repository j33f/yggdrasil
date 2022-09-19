'use strict';
/**
 * Instantiate core services
 */

async function instantiate (yggdrasil, config) {
  console.time('time: ⏱   Base startup took');
  console.time('time: ⏱   Load config took');

  /** load the config **/
  yggdrasil.loadConfig(config);
  console.timeEnd('time: ⏱   Load config took');

  console.time('time: ⏱   Configure Yggdrasil base took');

  /** Prepares the yggdrasil to be served if needed **/
  yggdrasil.server = {};

  console.time('time: ⏱   Add Events and Logger service');
  /** Adds events capabilities to the yggdrasil **/
  yggdrasil.events = new yggdrasil.lib.services.events(); // adds some methods to yggdrasil as shortcuts: see controller
  yggdrasil.listen = (...args) => yggdrasil.events.listen(...args);
  yggdrasil.stopListening = (...args) => yggdrasil.events.stopListening(...args);
  yggdrasil.listenOnce = (...args) => yggdrasil.events.listenOnce(...args);
  yggdrasil.fire = (...args) => yggdrasil.events.fire(...args);

  /** Ads the logger **/
  yggdrasil.loggerService = new yggdrasil.lib.services.logger(yggdrasil);
  yggdrasil.logger = yggdrasil.loggerService.logger;

  console.timeEnd('time: ⏱   Add Events and Logger service');

  console.timeEnd('time: ⏱   Configure Yggdrasil base took');

  /** Define storage providers **/
  console.time('time: ⏱   Defining Storages took');
  yggdrasil.storage = {
    mongo: new yggdrasil.lib.drivers.mongo(yggdrasil, yggdrasil.config.mongo),
    redis: new yggdrasil.lib.drivers.redis(yggdrasil, yggdrasil.config.redis),
    isConnected: false
  };
  console.timeEnd('time: ⏱   Defining Storages took');

  yggdrasil.fire('log', 'info', '🌳  New yggdrasil ready to be instantiated...');
  console.timeEnd('time: ⏱   Base startup took');

  console.time('time: ⏱   yggdrasil instantiation took');
  try {
    await yggdrasil.storage.mongo.connect();
    await yggdrasil.storage.redis.connect();
  } catch (e) {
    yggdrasil.fire('log', 'error', '☠️☠️☠️☠️☠️☠️☠️☠️️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️');
    yggdrasil.fire('log', 'error', ' ️  Fatal: Error when connecting to the storage providers! Terminating.️');
    yggdrasil.fire('log', 'error', '☠️☠️☠️☠️☠️☠️☠️☠️️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️☠️');
    throw e;
  }

  yggdrasil.storage.isConnected = true;
  yggdrasil.storageService = new yggdrasil.lib.services.storage(yggdrasil);

  console.time('time: ⏱   Repositories instantiation took');
  yggdrasil.repositories = new yggdrasil.lib.businessObjects.repositories(yggdrasil);
  console.timeEnd('time: ⏱   Repositories instantiation took');

  console.time('time: ⏱   Policies manager instantiation took');
  yggdrasil.policies = new yggdrasil.lib.businessObjects.Policies(yggdrasil);
  console.timeEnd('time: ⏱   Policies manager instantiation took');

  yggdrasil.fire('startup/core');
  console.timeEnd('time: ⏱   yggdrasil instantiation took');
}

module.exports = instantiate;