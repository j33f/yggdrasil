'use strict';
require('module-alias/register');

module.exports = {
  businessObjects: require('@lib/businessObjects'),
  controllers: require('@lib/controllers'),
  drivers: require('@lib/drivers'),
  services: require('@lib/services'),
  utils: require('@lib/utils')
};