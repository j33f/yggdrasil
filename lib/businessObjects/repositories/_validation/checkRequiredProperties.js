'use strict';
const Bluebird = require('bluebird');
const dot = require('dot-object');
const {castArray, isObject} = require('lodash');

/**
 * Check if required policies are there
 * @param repository
 * @param flattenObject
 * @param errors
 * @returns {Promise<void>}
 * @private
 */
module.exports = (repository, flattenObject, errors = {}) => {
  // check for required properties
  if (repository.model.required) {
    repository.model.requiredIfCreatedVia = repository.model.requiredIfCreatedVia || {};
    repository.model.requiredIfCreatedVia.default = repository.model.requiredIfCreatedVia.default
      ? repository.model.requiredIfCreatedVia.default.concat(repository.model.required)
      : repository.model.required;
  }

  repository.model.requiredIfCreatedVia = repository.model.requiredIfCreatedVia || {};
  const createdVia = castArray(repository.model.requiredIfCreatedVia[flattenObject.createdVia] || []);

  createdVia.forEach(key => {
    // if key is required for repository object and has no exception due to user policy, then raise an error
    if (!flattenObject[key]) {
      errors[key] = {
        message: key + ' is required because created via ' + flattenObject.createdVia + ', but not set',
        key: key,
        type: 'required'
      };
    }
  });

  if (repository.model.requiredIf) {
    const requiredIf = castArray(repository.model.requiredIf);
    requiredIf.forEach(entry => {
      // only check for missing optional elements required
      if (!flattenObject[entry.path]) {
        // check every conditions, on first failed : push in errors and break for repository property
        entry.conditions.forEach(condition => {
          if (!errors[entry.path] && condition.operand && condition.operation && flattenObject[condition.operand]) {
            if (condition.operation === 'oneOf') {
              if (repository.yggdrasil.lib.utils.format.oneOf(flattenObject[condition.operand], condition.oneOf, null) !== null) {
                errors[entry.path] = {
                  message: entry.path + ' must be set when ' + condition.operand + ' is one of ' + JSON.stringify(condition.oneOf) + '. "' + flattenObject[condition.operand] + '" have been given.',
                  key: entry.path,
                  type: 'required'
                };
              }
            } else {
              repository.yggdrasil.logger.warn(`The "${condition.operation}" is not yet supported (in model from repository "${repository.name}")`);
            }
          } else {
            let flatCondition;
            dot.dot(condition, flatCondition);
            if (!condition.operand) {
              repository.yggdrasil.logger.warn(`The condition operand is missing (in model from repository "${repository.name}") near ${flatCondition}`);
            }
            if (!condition.operation) {
              repository.yggdrasil.logger.warn(`The condition operation is missing (in model from repository "${repository.name}") near ${flatCondition}`);
            }
          }
        });
      }
    });
  }
  return Bluebird.resolve(errors);
};
