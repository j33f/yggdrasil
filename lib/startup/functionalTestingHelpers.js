'use strict';

const
  { writeFileSync } = require('fs'),
  { merge } = require('lodash');

/**
 * Reconfigure the current yggdrasil instance repositories to use the testing indexes and inject fixtures into the database
 */
async function configureYggdrasilForFunctionalTesting (yggdrasil, _yggdrasil) {
  _yggdrasil.fire('log', 'info', '!!! Injecting fixtures');
  _yggdrasil.functionalTestingMode = true;

  if (_yggdrasil.fixtures === undefined) {
    throw new Error('configureYggdrasilForFunctionalTesting: you should have injected fixtures into yggdrasil.fixtures first');
  }

  Object.keys(yggdrasil.repositories).forEach(key => {
    if (key !== 'yggdrasil') {
      _yggdrasil.fire('log', 'info', `configuring repository "${key}" to have "testing_${_yggdrasil.repositories[key].index}" as index`);
      _yggdrasil.repositories[key]._setIndexCollection('testing_' + yggdrasil.repositories[key].index);
    }
  });

  // injects fixtures
  Object.keys(yggdrasil.fixtures).forEach(index => {
    Object.keys(yggdrasil.fixtures[index]).forEach(collection => {
      _yggdrasil.fixtures[index][collection].forEach(async item => {
        await _yggdrasil.storageService.set({
          index: index,
          collection: collection,
          body: item
        });
      });
    });
  });

  _yggdrasil.functionalTestingInitDone = true;

  _yggdrasil.fire('log', 'info', '!!! Fixtures injected');

  /**
   * Helps to cleanup the testing fixtures
   * @param currentInstance
   */
  _yggdrasil.cleanupFunctionalTestingdata = async (currentInstance) => {
    currentInstance.logger.info('!!! Deleting fixtures');
    if (currentInstance.fixtures === undefined) {
      throw new Error('configureYggdrasilForFunctionalTesting: you should have injected fixtures into yggdrasil.fixtures first');
    }
    currentInstance.logger.info('>>> Indexes to delete', Object.keys(currentInstance.fixtures));

    try {
      currentInstance.storageService.dropDatabase(Object.keys(currentInstance.fixtures));
    } catch (e) {
      console.log(e);
    }

    currentInstance.logger.info('!!! Fixtures deleted');

    return currentInstance;
  };

  return _yggdrasil;
}

/**
 * Start a server instance for functional testing purposes
 * @param yggdrasil
 * @param fixtures
 * @param config
 * @returns {Promise<*>}
 */
async function startFunctionalTestingServer (yggdrasil, fixtures, config) {
  try {
    const defaultConfig = require('rc')('yggdrasil', require('../../defaultConfig'));

    yggdrasil.fixtures = fixtures;

    /** writes the current server PID into a file so that the server can be interrupted or killed easily **/
    writeFileSync('/var/run/yggdrasilTestingServer.pid', String(process.pid));

    /** replace defaultConfig parts with testing config **/
    config = merge(defaultConfig, config);

    const _yggdrasil = await yggdrasil.startup.startServer(config);
    return await configureYggdrasilForFunctionalTesting(yggdrasil, _yggdrasil);
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
}

module.exports = startFunctionalTestingServer;