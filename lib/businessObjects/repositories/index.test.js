'use strict';
require('module-alias/register');

const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
require('should-sinon');

const Repositories = rewire('.');

let yggdrasil, repositories, constructorR, constructorA, constructorF, constructorU, constructorFoo;

constructorR = sinon.stub();
constructorA = sinon.stub();
constructorF = sinon.stub();
constructorU = sinon.stub();
constructorFoo = sinon.stub();

class Repository {
  constructor(y) {
    constructorR(y);
  }
}

class A extends Repository {
  constructor(y) {
    super(y);
    constructorA(y);
  }
}

class F extends Repository {
  constructor(y) {
    super(y);
    constructorF(y);
  }
}

class U extends Repository {
  constructor(y) {
    super(y);
    constructorU(y);
  }
}

class Foo extends Repository {
  constructor(y) {
    super(y);
    constructorFoo(y);
  }
}

describe('Rrepositories', () => {
  beforeEach(() => {
    yggdrasil = {
      isMock: true,
      events: require('@unitTests/mocks/eventsService.stub'),
      lib: {
        controllers: {
          router: {
            addRoute: sinon.stub()
          }
        }
      },
      logger: {
        info: sinon.stub(),
        warn: sinon.stub()
      },
      socketIOListeners: []
    };
    yggdrasil.fire = yggdrasil.events.fire;
    yggdrasil.listen = yggdrasil.events.listen;
    yggdrasil.listenOnce = yggdrasil.events.listenOnce;

    Repositories.__set__('AuthRepository', A);
    Repositories.__set__('FilesRepository', F);
    Repositories.__set__('UsersRepository', U);
    Repositories.__set__('Repository', Repository);

    repositories = new Repositories(yggdrasil);
    sinon.resetHistory();
  });

  describe('#topology', () => {
    const properties = ['yggdrasil'];
    const methods = ['initReprositories', 'addSimpleRepository', 'addRepository'];

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
        should.exist(repositories[prop]);
        should(repositories[prop] instanceof Repository).be.true();
      });
    });
  });

  describe('#addSimpleRepository', () => {
    it('should add a repository named "Foo" and the repo should be in "this.foo"', () => {
      const response = repositories.addSimpleRepository('Foo', 'foo', 'bar');
      should(response).be.true();
      should.exist(repositories.foo);
    });

    it('should not add a repository named "Auth"', () => {
      const response = repositories.addSimpleRepository('Auth', 'foo', 'bar');
      should(response).be.false();
      should(yggdrasil.fire).have.been.calledWith('log', 'warn', 'A repository named "Auth" already exists !');
    });
  });

  describe('#addRepository', () => {
    it('should add a repository named "Foo" and the repo should be in "this.foo"', () => {
      const response = repositories.addRepository('Foo', Foo);
      should(response).be.true();
      should.exist(repositories.foo);
      should(constructorFoo).have.been.called();
    });

    it('should not add a repository named "Auth"', () => {
      const response = repositories.addRepository('Auth', Foo);
      should(response).be.false();
      should(yggdrasil.fire).be.calledWith('log', 'warn', 'A repository named "Auth" already exists !');
      should(constructorFoo).have.not.been.called();
    });
  });
});