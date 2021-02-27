'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');

const Repositories = rewire('.');

let yggdrasil, repositories, constructorA, constructorF, constructorU;

constructorA = sinon.stub();
constructorF = sinon.stub();
constructorU = sinon.stub();

class A {
  constructor(y) {
    constructorA(y);
  }
}

class F {
  constructor(y) {
    constructorF(y);
  }
}

class U {
  constructor(y) {
    constructorU(y);
  }
}

describe('Rrepositories', () => {
  beforeEach(() => {
    yggdrasil = {
      lib: {
        controllers: {}
      },
      logger: {
        info: sinon.stub(),
        warn: sinon.stub()
      },
      socketIOListeners: []
    };

    Repositories.__set__('AuthRepository', A);
    Repositories.__set__('FilesRepository', F);
    Repositories.__set__('UsersRepository', U);

    repositories = new Repositories(yggdrasil);
  });

  describe('#topology', () => {
    const properties = ['yggdrasil'];
    const methods = ['initReprositories', 'addRepository'];

    properties.forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(repositories).have.ownProperty(prop);
      });
    });

    methods.forEach(method => {
      it(`should have the '${method}' method`, () => {
        should(typeof repositories[method]).be.eql('function');
      });
    });
  });

  describe('#initRepositories', () => {
    beforeEach(() => {
      repositories.initReprositories();
    });

    ['auth', 'files', 'users'].forEach(prop => {
      it(`should have the '${prop}' property`, () => {
        should(repositories).have.ownProperty(prop);
      });
    });

    [constructorA, constructorF, constructorU].forEach(stub => {
      it(`should have called '${stub}' constructor`, () => {
        should(stub).have.been.calledWith(yggdrasil);
      });
    });
  });

  describe('#addRepository', () => {
    it('should add a repository named "Foo" and the repo should be in "this.foo"', () => {
      const response = repositories.addRepository('Foo', 'foo', 'bar');
      should(response).be.true();
      should.exist(repositories.foo);
    });

    it('should not add a repository named "Auth"', () => {
      const response = repositories.addRepository('Auth', 'foo', 'bar');
      should(response).be.false();
      should(yggdrasil.logger.warn).have.been.calledWith('A repository named "Auth" already exists !');
    });
  });
});