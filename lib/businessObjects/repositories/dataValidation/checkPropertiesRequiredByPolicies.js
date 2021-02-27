'use strict';

const Bluebird = require('bluebird');
const {castArray} = require('lodash');

/**
 * Check if the properties required by some policies are there
 * @param repository
 * @param flattenObject
 * @param errors
 * @param objectPolicies
 * @returns {Promise<void>}
 * @private
 */
module.exports = (repository, flattenObject, objectPolicies, errors = {}) => {
  const requiredKeys = Object.keys(repository.model.requiredIfPolicy);

  requiredKeys.forEach(key => {
    const policies = castArray(repository.model.requiredIfPolicy[key]);
    policies.forEach(policy => {
      if (!castArray(objectPolicies).includes(policy) || flattenObject[key]) {
        return Bluebird.resolve(errors);
      }
      //should raise an error only if there is no rule into the createdVia model's section corresponding to the current case
      errors[key] = {
        message: `${key} is required due to policy ${policy} but not set`,
        key: key,
        type: 'policy',
        policy: policy
      };
    });
  });

  return Bluebird.resolve(errors);
};