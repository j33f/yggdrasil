'use strict';

const Bluebird = require('bluebird');
const {castArray} = require('lodash');

/**
 * Format the proper error
 * @param entry
 * @param flattenObject
 * @param type
 * @param message
 * @returns {{message: (*|string), type: *, key: *}}
 */
const formatError = (entry, flattenObject, type = null, message = null) => {
  message =
    message ||
    `"${entry.path}" must be a valid "${type || entry.type}" but "${flattenObject[entry.path]}" have been given.`;

  return {
    message: message,
    key: entry.path,
    type: entry.type
  };
};

/**
 * First check the types and format each types properly if they can be
 * @param repository
 * @param flattenObject
 * @param errors
 * @returns {Promise<void>}
 * @private
 */
module.exports = (repository, flattenObject, errors = {}) => {
  if (!repository.model.formats) {
    return Bluebird.resolve(errors);
  }

  castArray(repository.model.formats).forEach(entry => {
    if (!flattenObject[entry.path]) {
      return Bluebird.resolve(errors);
    }
    switch (entry.type) {
      case 'email':
        if (repository.yggdrasil.lib.utils.format.email(flattenObject[entry.path]) === null && !errors[entry.path]) {
          errors[entry.path] = formatError(entry, flattenObject);
        }
        break;
      case 'phone':
        if (repository.yggdrasil.lib.utils.format.phone(flattenObject[entry.path]) === null && !errors[entry.path]) {
          errors[entry.path] = formatError(entry, flattenObject, 'phone number');
        }
        break;
      case 'trigram':
        if (repository.yggdrasil.lib.utils.format.trigram(flattenObject[entry.path]) === null && !errors[entry.path]) {
          errors[entry.path] = formatError(entry, flattenObject);
        }
        break;
      case 'oneOf':
        if (repository.yggdrasil.lib.utils.format.oneOf(flattenObject[entry.path], entry.oneOf, entry.defaultValue) === null && !errors[entry.path]) {
          errors[entry.path] = formatError(
            entry,
            flattenObject,
            null,
            `"${entry.path}" must be one of ${JSON.stringify(entry.oneOf)} but "${flattenObject[entry.path]}" have been given.`);
        }
        break;
      case 'date':
      case 'time':
        if (repository.yggdrasil.lib.utils.format.dateTime.toUnix(flattenObject[entry.path]) === null && !errors[entry.path]) {
          errors[entry.path] = formatError(entry, flattenObject);
        }
        break;
      case 'int':
        if (repository.yggdrasil.lib.utils.format.checkInt(flattenObject[entry.path], entry.minValue, entry.maxValue) === null && !errors[entry.path]) {
          errors[entry.path] = formatError(
            entry,
            flattenObject,
            null,
            `"${entry.path}" must be a valid integer within ${entry.minValue || Number.MIN_SAFE_INTEGER} and ${entry.maxValue || Number.MAX_SAFE_INTEGER} but "${flattenObject[entry.path]}" have been given.`
          );
        }
        break;
      default:
        repository.yggdrasil.logger.warn(`Caution, unknown type "${entry.type}" in ${repository.name} Repository model`);
    }
  });
  return Bluebird.resolve(errors);
};