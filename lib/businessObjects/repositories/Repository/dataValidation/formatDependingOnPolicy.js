'use strict';

const Bluebird = require('bluebird');
const {castArray} = require('lodash');

/**
 * Check some properties formats when some policies are there
 * @param repository
 * @param flattenObject
 * @param object
 * @returns {Promise<*>}
 * @private
 */
module.exports = (repository, flattenObject, object) => {
  let formats = repository.model.formats || [];

  // cleanup object depending on the model and the current user role if any

  // check if there are policies to ckeck into the object and the format
  if (object.policies && repository.model.formatsIfPolicy) {
    object.policies.forEach(policy => {
      if (repository.model.formatsIfPolicy[policy]) {
        // adds the formats
        formats = formats.concat(repository.model.formatsIfPolicy[policy]);
      }
    });
  }

  castArray(formats).forEach(entry => {
    switch (entry.type) {
      case 'email':
        flattenObject[entry.path] = repository.yggdrasil.lib.utils.format.email(flattenObject[entry.path]);
        break;
      case 'phone':
        flattenObject[entry.path] = repository.yggdrasil.lib.utils.format.phone(flattenObject[entry.path]);
        break;
      case 'trigram':
        flattenObject[entry.path] = repository.yggdrasil.lib.utils.format.trigram(flattenObject[entry.path]);
        break;
      case 'oneOf':
        flattenObject[entry.path] = repository.yggdrasil.lib.utils.format.oneOf(flattenObject[entry.path], entry.oneOf, entry.defaultValue);
        break;
      case 'date':
      case 'time':
        flattenObject[entry.path] = repository.yggdrasil.lib.utils.format.dateTime.toUnix(flattenObject[entry.path]);
        break;
    }
  });

  return Bluebird.resolve(flattenObject);
};
