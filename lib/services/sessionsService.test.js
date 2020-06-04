'use strict';

require('module-alias/register');

const
  should = require('should'),
  sinon = require('sinon');

require('should-sinon');


describe('Sessions service', () => {

  let yggdrasil, SessionsService, testService, storageServiceStub, getCacheStub, setCacheStub, delCacheStub, mockedJWTLib, jwtSignStub, jwtDecodeStub;

  beforeEach(() => {
    SessionsService = require('./sessionsService');

    storageServiceStub = {
      setCache: function() {return Promise.resolve();},
      getCache: function() {return Promise.resolve();},
      delCache: function() {return Promise.resolve();}
    };

    yggdrasil = {
      logger: {warn: sinon.stub()},
      uuid: () => {
        return 'ThisIsAnUUID';
      },
      config: {
        iss: 'ThisIsAnIssuerId',
        JWTSecret: 'ThisIsAJWTSecret',
        sessions: {
          duration: '10000',
          durationSeconds: '10'
        }
      },
      storageService: storageServiceStub
    };

    mockedJWTLib = {
      isMock: true,
      sign: function() {return 'SignedJWT';},
      decode: function() {return 'DecodedJWT';}
    };

    testService = new SessionsService(yggdrasil, mockedJWTLib);

    yggdrasil.sessionsService = testService;

    sinon.reset();
  });

  describe('#topology', () => {
    const
      properties = ['yggdrasil'],
      methods = [
        'sessionId',
        'createJWT',
        'getJWT',
        'isRevoked',
        'isRevokedPromise',
        'decodeJWT',
        'revoke'
      ];

    properties.forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(testService).have.ownProperty(prop);
      });
    });

    methods.forEach(method => {
      it(`should have the '${method}' method`, () => {
        should(typeof testService[method]).be.eql('function');
      });
    });
  });

  describe('#constructor', () => {
    it('should use the given jwt lib', () => {
      should(testService.jwtLib.isMock).eqls(true);
    });
  });

  describe('#sessionId', () => {
    it('should generate a proper sessionId', () => {
      should(testService.sessionId('ThisIsAJit', 'ThisIsAnIssuerId')).be.eql('session:ThisIsAnIssuerId:ThisIsAJit');
    });

    it('should throw if no iss is given', () => {
      (function() {testService.sessionId('ThisIsAJit');}).should.throwError('No jti or iss given');
    });

    it('should throw if no jit is given', () => {
      (function() {testService.sessionId(undefined, 'ThisIsAnIssuerId');}).should.throwError('No jti or iss given');
    });
  });

  describe('#createJWT', () => {
    const payload = {foo: 'bar'};

    it('should call the jwt lib with the right payload and parameters', () => {
      jwtSignStub = sinon.stub(testService.jwtLib, 'sign').returns('SignedJWT');

      return testService.createJWT(payload)
        .then(() => {
          jwtSignStub.should.be.calledOnce();
          jwtSignStub.should.be.calledWith({foo: 'bar', jti: 'ThisIsAnUUID', iss: yggdrasil.config.iss}, yggdrasil.config.JWTSecret, {expiresIn: yggdrasil.config.sessions.duration});
        });
    });

    it('should call yggdrasil.storageService.setCache with the right payload', () => {
      jwtSignStub = sinon.stub(testService.jwtLib, 'sign').returns('SignedJWT');
      setCacheStub = sinon.stub(storageServiceStub, 'setCache').resolves();

      return testService.createJWT(payload)
        .then(() => {
          setCacheStub.should.be.calledOnce();
          setCacheStub.should.be.calledWith({
            key: ['session', yggdrasil.config.iss, 'ThisIsAnUUID'].join(':'),
            body: 'SignedJWT',
            options: {
              ttl: yggdrasil.config.sessions.durationSeconds
            }
          });
        });
    });
    it('should returns a promise fulfilled with a signed JWT', () => {
      jwtSignStub = sinon.stub(testService.jwtLib, 'sign').returns('SignedJWT');

      return testService.createJWT(payload)
        .then(response => {
          should(response).eqls('SignedJWT');
        });
    });
  });

  describe('#isRevoked', () => {
    it('should call the callback with true (revoked) and no error if the payload does not contains a jti property', (done) => {
      const
        req = {yggdrasil: yggdrasil},
        callback = (err, response) => {
          should(err).be.null();
          should(response).be.true();
          done();
        };

      testService.isRevoked(req, {}, callback);
    });

    it('should call the callback with true (revoked) and no error if the payload is valid but not found in cache', (done) => {
      const callback = (err, response) => {
        should(err).be.null();
        should(response).be.true();
        should(getCacheStub).be.calledOnce();
        done();
      };
      let req = {yggdrasil: yggdrasil};

      getCacheStub = sinon.stub(req.yggdrasil.storageService, 'getCache').rejects();

      testService.isRevoked(req, {jti: 'ThisIsAJTI'}, callback);
    });

    it('should call the callback with true (revoked) and no error if the payload is valid, found in cache but empty', (done) => {
      const callback = (err, response) => {
        should(err).be.null();
        should(response).be.true();
        should(getCacheStub).be.calledOnce();
        done();
      };
      let req = {yggdrasil: yggdrasil};

      getCacheStub = sinon.stub(req.yggdrasil.storageService, 'getCache').resolves('');

      testService.isRevoked(req, {jti: 'ThisIsAJTI'}, callback);
    });

    it('should call the callback with false (valid) and no error if the payload is valid, found in cache and not empty', (done) => {
      const callback = (err, response) => {
        should(err).be.null();
        should(response).be.false();
        should(getCacheStub).be.calledOnce();
        done();
      };
      let req = {yggdrasil: yggdrasil};

      getCacheStub = sinon.stub(req.yggdrasil.storageService, 'getCache').resolves({foo: 'bar'});

      testService.isRevoked(req, {jti: 'ThisIsAJTI'}, callback);
    });
  });

  describe('#isRevokedPromise', () => {
    it('should reject with "no JTI in JWT" if the payload does not contains a jti property', () => {
      const response = testService.isRevokedPromise(yggdrasil, {});

      should(response).be.rejectedWith('Invalid JWT');
    });

    it('should reject with "Revoked JWT" if the payload is valid but not found in cache', () => {

      getCacheStub = sinon.stub(yggdrasil.storageService, 'getCache').rejects();

      const response = testService.isRevokedPromise(yggdrasil, {jti: 'ThisIsAJTI'});

      should(response).be.rejectedWith('Revoked JWT');
    });

    it('should call the callback with true (revoked) and no error if the payload is valid, found in cache but empty', () => {
      getCacheStub = sinon.stub(yggdrasil.storageService, 'getCache').resolves('');

      const response = testService.isRevokedPromise(yggdrasil, {jti: 'ThisIsAJTI'});

      should(response).be.rejectedWith('Revoked JWT');
    });

    it('should call the callback with false (valid) and no error if the payload is valid, found in cache and not empty', () => {
      getCacheStub = sinon.stub(yggdrasil.storageService, 'getCache').resolves({foo: 'bar'});

      const response = testService.isRevokedPromise(yggdrasil, {jti: 'ThisIsAJTI'});

      should(response).be.resolved();
    });
  });

  describe('#getJWT', () => {
    it('should get JWT from req.headers', () => {
      const response = testService.getJWT({headers: { authorization: 'Bearer ThisIsTheJWT'}});
      should(response).be.eql('ThisIsTheJWT');
    });

    it('should get JWT from req.query', () => {
      const response = testService.getJWT({headers: {}, query: { token: 'ThisIsTheJWT'}});
      should(response).be.eql('ThisIsTheJWT');
    });

    it('should get JWT from req.cookies', () => {
      const response = testService.getJWT({headers: {}, cookies: { Authorization: 'Bearer ThisIsTheJWT'}});
      should(response).be.eql('ThisIsTheJWT');
    });

    it('should return null if no bearer found', () => {
      const response = testService.getJWT({headers: {}, cookies: {}});
      should(response).be.null();
    });
  });

  describe('#decodeJWT', () => {
    it ('Should call jwt.decode', () => {
      const token = 'ThisIsAToken';

      jwtDecodeStub = sinon.stub(mockedJWTLib, 'decode').returns('DecodedJWT');

      const response = testService.decodeJWT(token);

      should(response).eqls('DecodedJWT');
      jwtDecodeStub.should.be.calledOnce();
      jwtDecodeStub.should.be.calledWith(token, {json: true, complete: false});
    });
  });

  describe('#revoke', () => {
    it ('Should call yggdrasil.storageService.delCache', () => {
      const payload = {foo: 'bar', jti: 'ThisIsAJTI'};

      delCacheStub = sinon.stub(storageServiceStub, 'delCache').resolves();

      testService.revoke(payload);

      delCacheStub.should.be.calledOnce();
      delCacheStub.should.be.calledWith({key: ['session', yggdrasil.config.iss, payload.jti].join(':')});
    });
  });
});
