'use strict';

require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
require('should-sinon');

const SessionsService = require('./sessionsService');

describe('Sessions service', () => {

  let yggdrasil, testService, storageServiceStub, JWTLibStub, uuidStub;

  beforeEach(() => {

    storageServiceStub = {
      setCache: sinon.stub().resolves(),
      getCache: sinon.stub().resolves(),
      delCache: sinon.stub().resolves()
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

    JWTLibStub = {
      isMock: true,
      sign: sinon.stub().returns('SignedJWT'),
      decode: sinon.stub().returns('DecodedJWT')
    };

    uuidStub = sinon.stub().returns('ThisIsAnUUID');

    sinon.resetHistory();

    testService = new SessionsService(yggdrasil, JWTLibStub, uuidStub);
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
    it('should use the uuid jwt lib', () => {
      should(testService.uuid.name).eqls('functionStub');
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

    it('should call the jwt lib with the right payload and parameters', async () => {
      await testService.createJWT(payload);
      should(JWTLibStub.sign).have.been.calledOnce();
      should(JWTLibStub.sign).have.been.calledWith({foo: 'bar', jti: 'ThisIsAnUUID', iss: yggdrasil.config.iss}, yggdrasil.config.JWTSecret, {expiresIn: yggdrasil.config.sessions.duration});
    });

    it('should call yggdrasil.storageService.setCache with the right payload', async () => {
      await testService.createJWT(payload);
      should(storageServiceStub.setCache).have.been.calledOnce();
      should(storageServiceStub.setCache).have.been.calledWith({
        key: ['session', yggdrasil.config.iss, 'ThisIsAnUUID'].join(':'),
        body: 'SignedJWT',
        options: {
          ttl: yggdrasil.config.sessions.durationSeconds
        }
      });
    });

    it('should returns a promise fulfilled with a signed JWT', async () => {
      const response = await testService.createJWT(payload);
      should(response).eqls('SignedJWT');
    });
  });

  describe('#isRevoked', () => {
    it('should call the callback with true (revoked) and no error if the payload does not contains a jti property', (done) => {
      testService.isRevoked({}, {}, (err, response) => {
        should(err).be.null();
        should(response).be.true();
        done();
      });
    });

    it('should call the callback with true (revoked) and no error if the payload is valid but not found in cache', (done) => {
      yggdrasil.storageService.getCache = sinon.stub().rejects();
      testService = new SessionsService(yggdrasil, JWTLibStub, uuidStub);

      testService.isRevoked({}, {jti: 'ThisIsAJTI'}, (err, response) => {
        should(err).be.null();
        should(response).be.true();
        should(yggdrasil.storageService.getCache).have.been.calledOnce();
        done();
      });
    });

    it('should call the callback with true (revoked) and no error if the payload is valid, found in cache but empty', (done) => {
      yggdrasil.storageService.getCache = sinon.stub().resolves();
      testService = new SessionsService(yggdrasil, JWTLibStub, uuidStub);
      testService.isRevoked({}, {jti: 'ThisIsAJTI'}, (err, response) => {
        should(err).be.null();
        should(response).be.true();
        should(yggdrasil.storageService.getCache).have.been.calledOnce();
        done();
      });
    });

    it('should call the callback with false (valid) and no error if the payload is valid, found in cache and not empty', (done) => {
      yggdrasil.storageService.getCache = sinon.stub().resolves({foo: 'bar'});
      testService = new SessionsService(yggdrasil, JWTLibStub, uuidStub);

      testService.isRevoked({}, {jti: 'ThisIsAJTI'}, (err, response) => {
        should(err).be.null();
        should(response).be.false();
        should(yggdrasil.storageService.getCache).have.been.calledOnce();
        done();
      });
    });
  });

  describe('#isRevokedPromise', () => {
    it('should reject with "no JTI in JWT" if the payload does not contains a jti property', () => {
      const response = testService.isRevokedPromise({});

      should(response).be.rejectedWith('Invalid JWT');
    });

    it('should reject with "Revoked JWT" if the payload is valid but not found in cache', () => {
      yggdrasil.storageService.getCache = sinon.stub().rejects();
      testService = new SessionsService(yggdrasil, JWTLibStub, uuidStub);

      const response = testService.isRevokedPromise({jti: 'ThisIsAJTI'});

      should(response).be.rejectedWith('Revoked JWT');
    });

    it('should call the callback with true (revoked) and no error if the payload is valid, found in cache but empty', () => {
      yggdrasil.storageService.getCache = sinon.stub().resolves('');
      testService = new SessionsService(yggdrasil, JWTLibStub, uuidStub);

      const response = testService.isRevokedPromise({jti: 'ThisIsAJTI'});

      should(response).be.rejectedWith('Revoked JWT');
    });

    it('should call the callback with false (valid) and no error if the payload is valid, found in cache and not empty', () => {
      yggdrasil.storageService.getCache = sinon.stub().resolves({foo: 'bar'});
      testService = new SessionsService(yggdrasil, JWTLibStub, uuidStub);

      const response = testService.isRevokedPromise({jti: 'ThisIsAJTI'});

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
      const response = testService.decodeJWT(token);

      should(response).eqls('DecodedJWT');
      should(JWTLibStub.decode).have.been.calledOnce();
      should(JWTLibStub.decode).have.been.calledWith(token, {json: true, complete: false});
    });
  });

  describe('#revoke', () => {
    it ('Should call yggdrasil.storageService.delCache', () => {
      const payload = {foo: 'bar', jti: 'ThisIsAJTI'};

      testService.revoke(payload);

      should(storageServiceStub.delCache).have.been.calledOnce();
      should(storageServiceStub.delCache).have.been.calledWith({key: ['session', yggdrasil.config.iss, payload.jti].join(':')});
    });
  });
});
