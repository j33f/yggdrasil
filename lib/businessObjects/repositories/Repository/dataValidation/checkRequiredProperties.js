'use strict';
const Bluebird = require('bluebird');
const dot = require('dot-object');
const {castArray} = require('lodash');

/**
 * Check if required policies are there
 * @param repository
 * @param flattenObject
 * @param errors
 * @returns {Promise<void>}
 * @private
 */
module.exports = (repository, flattenObject, errors = {}) => {
  if (repository.model.requiredIf) {
    const requiredIf = castArray(repository.model.requiredIf);
    requiredIf.forEach(entry => {
      // only check for missing optional elements required
      if (flattenObject[entry.path]) {
        return;
      }
      // check every conditions, on first failed : push in errors and break for repository property
      entry.conditions.forEach(condition => {
        if (!condition.operand || condition.operation !== 'oneOf') {
          let flatCondition;
          dot.dot(condition, flatCondition);
          repository.yggdrasil.fire('log', 'warn', `There is something wrong with a model condition (in model from repository "${repository.name}") near ${flatCondition}`);
          return;
        }
        if (repository.yggdrasil.lib.utils.format.oneOf(flattenObject[condition.operand], condition.oneOf, null) !== null) {
          errors[entry.path] = {
            message: entry.path + ' must be set when ' + condition.operand + ' is one of ' + JSON.stringify(condition.oneOf) + '. "' + flattenObject[condition.operand] + '" have been given.',
            key: entry.path,
            type: 'required'
          };
        }
      });
    });
  }
  return Bluebird.resolve(errors);
};
