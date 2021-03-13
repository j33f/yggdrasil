'use strict';

const should = require('should');
const sinon = require('sinon');
require('should-sinon');
const retry = require('./retry');

describe('Utils Retry', () => {
  afterEach(() => {
    sinon.reset();
  });

  it('should retry until success', async () => {
    const func = sinon.stub().onFirstCall().rejects().onSecondCall().resolves();
    const onRetry = sinon.stub();

    await retry(func, {delay: 10}, onRetry);
    should(func).have.been.calledTwice();
    should(onRetry).have.been.calledOnce();
  });

  it('should reject if func is not a function', async () => {
    const func = 3;
    const onRetry = sinon.stub();

    try {
      await retry(func, {delay: 10}, onRetry);
    } catch(e) {
      should(e).eqls(new Error('fn must be a function, number given instead.'));
      should(onRetry).not.have.been.called();
    }
  });

  it('should reject if onRetry is not a function', async () => {
    const func = sinon.stub().onFirstCall().rejects().onSecondCall().resolves();
    const number = 3;

    try {
      await retry(func, {delay: 1}, number);
    } catch(e) {
      should(e).eqls(new Error('onRetry must be a function, number given instead.'));
      should(func).not.have.been.called();
    }
  });

  it('should reject if on maxRetry', async () => {
    const func = sinon.stub().rejects();
    const onRetry = sinon.stub();

    try {
      await retry(func, {maxRetries: 2, delay: 1}, onRetry);
      should(true).be.false('False success');
    } catch(e) {
      should(e).eqls(new Error('Error'));
      should(func).have.been.calledThrice();
      should(onRetry).have.been.calledTwice();
    }
  });
});