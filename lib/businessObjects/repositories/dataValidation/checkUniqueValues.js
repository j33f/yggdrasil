'use strict';

const Bluebird = require('bluebird');
const {castArray} = require('lodash');

/**
 * Check if values which must be unique are unique
 * @param repository
 * @param flattenObject
 * @param errors
 * @param isNewObject
 * @returns {Promise<void>}
 * @private
 */
module.exports = (repository, flattenObject, errors = {}, isNewObject = false) => {
  let promises = [];

  if (repository.model.mustBeUnique) {
    castArray(repository.model.mustBeUnique).forEach(key => {
      if (flattenObject[key]) {

        promises.push(
          repository.findDupes(flattenObject[key], key, isNewObject? null : flattenObject._id)
            .then(result => {
              if (result.list.length === 0) {
                return null;
              }

              return {
                message: key + ' must be unique. ' + flattenObject[key] + ' is already used.',
                key: key,
                type: 'unique'
              };
            })
            .then(result => {
              if (result !== null && !errors[key]) {
                errors[key] = result;
              }
            })
        );
      }
    });
  }

  return Bluebird.all(promises)
    .then(() => errors);
};