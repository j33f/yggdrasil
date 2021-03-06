'use strict';

const should = require('should');
const sinon = require('sinon');
require('should-sinon');
const bearer = require('./bearer');

let req, res, next;

let stubbedResStatus = sinon.stub();
let stubbedResJson = sinon.stub();

class Res {
  constructor() {}

  status(arg) {
    stubbedResStatus(arg);
    return this;
  }

  json(arg) {
    stubbedResJson(arg);
    return this;
  }
}

describe('Utils bearer', () => {
  beforeEach(() => {
    next = () => {};

    req = {
      get: sinon.stub().callsFake(() => {
        return 'bearer';
      }),
      startWith: sinon.stub().callsFake((what) => {
        return req.path.split('/')[0] === what;
      }),
      path: '/'
    };

    res = new Res();

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

    it('should require bearer otherwise', (done) => {
      next = () => {
        should(stubbedResStatus).have.been.calledWith(401);
        should(stubbedResJson).have.been.calledWith({
          status: 401,
          message: 'You must be authenticated to access this route.'
        });
        done();
      };

      req.path = '/a/route';
      req.method = 'GET';
      req.bearer = undefined;

      bearer.require(req, res, next);
    });
  });
});