'use strict';
require('module-alias/register');

module.exports = {
  controllers: require('@lib/controllers'),
  drivers: require('@lib/drivers'),
  businessObjects: require('@lib/businessObjects'),
  utils: require('@lib/utils')
};