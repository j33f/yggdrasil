'use strict';

const Bluebird = require('bluebird');

/**
 * Retry the given function if it fails
 * inspired from https://github.com/lando/lando/blob/c53a5e5f17a04764ddb2d5a68a104591f094c2f1/lib/promise.js#L28
 *
 * @param fn{function}
 * @param maxRetries{int}
 * @param delay{int} ms
 * @param onRetry{function}
 * @returns {*|PromiseLike<T | never>|Promise<T | never>}
 */
module.exports = (fn, {maxRetries = 30, delay = 1000} = {}, onRetry = () => {}) => Bluebird.resolve().then(() => {
  if (typeof fn !== 'function') {
    return Bluebird.reject(new Error(`fn must be a function, ${typeof fn} given instead.`));
  }

  if (typeof onRetry !== 'function') {
    return Bluebird.reject(new Error(`onRetry must be a function, ${typeof onRetry} given instead.`));
  }

  const retry = counter => Bluebird.try(
    () => fn()
  )
    .catch(err => {
      if (counter < maxRetries) {
        onRetry();
        counter++;
        return Bluebird
          .delay(delay)
          .then(() => retry(counter));
      }
      return Bluebird.reject(err);
    });

  return retry(0);
});