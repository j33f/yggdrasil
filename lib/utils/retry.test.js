'use strict';

const should = require('should');
const sinon = require('sinon');
require('should-sinon');

const retry = require('./retry');

let func, onRetry;

describe('Utils Retry', () => {
  afterEach(() => {
    if (func.resetHistory) {
      func.resetHistory();
    }
    if (onRetry.resetHistory) {
      onRetry.resetHistory();
    }
  });

  it('should reject if func is not a function', async () => {
    func = 3;
    onRetry = sinon.stub();

    try {
      await retry(func, {delay: 10}, onRetry);
    } catch(e) {
      should(e).eqls(new Error('fn must be a function, number given instead.'));
      should(onRetry).not.have.been.called();
    }
  });

  it('should reject if onRetry is not a function', async () => {
    func = sinon.stub();
    onRetry = 3;

    try {
      await retry(func, {delay: 1}, onRetry);
    } catch(e) {
      should(e).eqls(new Error('onRetry must be a function, number given instead.'));
      should(func).not.have.been.called();
    }
  });

  it('should resolve if given func do not throw', async () => {
    func = sinon.stub().resolves();
    onRetry = sinon.stub();

    await retry(func, {delay: 1}, onRetry);
    should(func).have.been.calledOnce();
    should(onRetry).not.have.been.called();
  });

  it('should reject after maxRetries fails', () => {
    func = sinon.stub().rejects();
    onRetry = sinon.stub();

    return retry(func, {maxRetries: 2, delay: 1}, onRetry)
      .catch(e => {
        should(e).eqls(new Error('Error'));
        should(func).have.been.calledThrice();
        should(onRetry).have.been.calledTwice();
      });
  });
});