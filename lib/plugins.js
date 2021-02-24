'use strict';
const
  { lstatSync, readdirSync } = require('fs'),
  { basename, join, resolve } = require('path');

const getDirectories = source => readdirSync(source)
  .filter(name => lstatSync(join(source, name)).isDirectory())
  .map(name => basename(name));

/**
 * Load the plugins files
 * @param yggdrasil
 * @returns {Promise<Array>}
 */
async function loadPlugins(yggdrasil) {
  const plugins = getDirectories(resolve(join(yggdrasil.rootPath, 'plugins')));

  let list = [];

  plugins.forEach((name) => {
    let plugin = {
      controllers: [],
      drivers: [],
      install: async () => {},
      name: name,
      repositories: [],
      routes: [],
      services: [],
      socketIoRoutes: [],
      utils: [],
      eventsListeners: []
    };

    try {
      plugin.install = require(resolve(join(yggdrasil.rootPath, 'plugins', name, 'install')));
    } catch (e) {
      console.log(`[plugin ${name}] have no install function.`);
    }

    const components = getDirectories(resolve(join(yggdrasil.rootPath, 'plugins', name)));

    components.forEach((component) => {
      if (plugin[component]) {
        try {
          plugin[component] = require(resolve(join(yggdrasil.rootPath, 'plugins', name, component)));
        } catch (e) {
          console.error(`[plugin ${name}] Cannot load ${component} component`);
        }
      } else {
        console.error(`[plugin ${name}] Unknown component type "${component}"`);
      }
    });

    list.push(plugin);
  });
  return list;
}

/**
 * Store the component for the plugin
 * @param yggdrasil
 * @param plugin
 * @param type
 * @returns {Promise<void>}
 * @private
 */
async function __plug (yggdrasil, plugin, type) {
  if (plugin[type]) {
    yggdrasil.plugins[type] = yggdrasil.plugins[type] || [];
    yggdrasil.plugins[type].push(plugin[type]);
  }
}

async function plugControllers (yggdrasil, plugin) {
  await __plug (yggdrasil, plugin, 'controllers');
}

async function plugDrivers (yggdrasil, plugin) {
  await __plug (yggdrasil, plugin, 'drivers');
}

async function plugUtils (yggdrasil, plugin) {
  await __plug (yggdrasil, plugin, 'utils');
}

async function plugRepositories (yggdrasil, plugin) {
  if (plugin.repositories) {
    yggdrasil.plugins.repositories[plugin.name] = plugin.repositories;
  }
}

async function plugServices (yggdrasil, plugin) {
  await __plug (yggdrasil, plugin, 'services');
}

async function plugRoutes (yggdrasil, plugin) {
  if (plugin.routes) {
    yggdrasil.use('/' + plugin.name, plugin.routes);
  }
}

async function plugSocketIoRoutes (yggdrasil, plugin) {
  if (plugin.socketIoRoutes) {
    yggdrasil.plugins.socketIoRoutes = yggdrasil.plugins.socketIoRoutes.concat(plugin.socketIoRoutes);
  }
}

async function plugEventsListeners (yggdrasil, plugin) {
  await __plug (yggdrasil, plugin, 'eventsListeners');
}


/**
 * Store the plugins parts in Yggdrasil
 * @param yggdrasil
 * @returns {Promise<void>}
 */
async function plugPlugins (yggdrasil) {
  yggdrasil.plugins = {
    controllers: [],
    drivers: [],
    install: [],
    repositories: {},
    routes: [],
    services: [],
    socketIoRoutes: [],
    utils: [],
    eventsListeners: []
  };

  const plugins = await loadPlugins(yggdrasil);

  plugins.forEach(async plugin => {
    yggdrasil.plugins[plugin.name] = {};
    await plugUtils(yggdrasil, plugin);
    await plugDrivers(yggdrasil, plugin);
    await plugServices(yggdrasil, plugin);
    await plugRepositories(yggdrasil, plugin);
    await plugControllers(yggdrasil, plugin);
    await plugRoutes(yggdrasil, plugin);
    await plugSocketIoRoutes(yggdrasil, plugin);
    await plugEventsListeners(yggdrasil, plugin);
    yggdrasil.plugins.install.push(plugin.install);
    yggdrasil.logger.info('Plugin loaded: ' + plugin.name);
  });
  yggdrasil.logger.info(plugins.length + ' plugin(s) successfully loaded.');
}

module.exports = plugPlugins;