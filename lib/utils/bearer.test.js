'use strict';

const should = require('should');
const sinon = require('sinon');
require('should-sinon');
const bearer = require('./bearer');

let req, res, next;

describe('Utils bearer', () => {
  beforeEach(() => {
    next = () => {};

    req = {
      get: sinon.stub().callsFake(a => {
        console.log(a);
        return 'bearer';
      }),
      startWith: sinon.stub().callsFake((what) => {
        return req.path.split('/')[0] === what;
      }),
      path: '/'
    };

    res = {
      status: sinon.stub().returns({json: sinon.stub().callsFake(next)}),
    };

  });
  afterEach(() => {
    sinon.reset();
  });

  describe('#retrieve', () => {
    it('should call req.get properly and put the bearer into req', (done) => {
      next = () => {
        should(req.get).have.been.calledWith('Authorization');
        should(req.bearer).eqls('bearer');
        done();
      };

      bearer.retrieve(req, null, next);
    });
  });

  describe('#require', () => {
    describe('should not require bearer if not needed', () => {
      it('- req.path === "/"', (done) => {
        next = () => {
          should(res.status).not.have.been.called();
          done();
        };

        bearer.require(req, res, next);
      });

      it('- req.path start with "/auth"', (done) => {
        next = () => {
          should(res.status).not.have.been.called();
          done();
        };

        req.path = '/auth/login';

        bearer.require(req, res, next);
      });

      it('- req.method === OPTIONS', (done) => {
        next = () => {
          should(res.status).not.have.been.called();
          done();
        };

        req.path = '/toto';
        req.method = 'OPTIONS';

        bearer.require(req, res, next);
      });
    });

    it('should require bearer otherwise', () => {
      let response = 'foo';
      next = () => {
        should(res.status).have.been.calledWith(401);
        should(res.json).have.been.calledWith({
          status: 401,
          message: 'You must be authenticated to access this route.'
        });
        should(response).eqls(undefined);
        done();
      };

      req.path = '/a/route';
      req.method = 'GET';
      req.bearer = undefined;

      response = bearer.require(req, res, next);
    })
  });
});