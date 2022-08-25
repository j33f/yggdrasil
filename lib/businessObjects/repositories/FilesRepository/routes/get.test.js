'use strict';

require('module-alias/register');

const sinon = require('sinon');
require('should-sinon');

const sandbox = sinon.createSandbox();

let yggdrasil;

const route = require('./get');
const handler = route.stack[0].handle;

describe('Files Repository > Routes > get', () => {

  beforeEach(() => {
    yggdrasil = {
      logger: require('@unitTests/mocks/logger.stub')(sandbox),
      events: require('@unitTests/mocks/eventsService.stub')(sandbox),
      repositories: {
        files: {
          get: sandbox.stub(),
          getFile: sandbox.stub().returns({content: 'FileContent', isLocation: true})
        }
      }
    };

    yggdrasil.fire = yggdrasil.events.fire;
    yggdrasil.listen = yggdrasil.events.listen;
    yggdrasil.listenOnce = yggdrasil.events.listenOnce;

    sandbox.resetHistory();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('#handler should be a function', () => {
    handler.should.be.a.Function();
  });

  it('should respond with 404 error in case of type mismatch', async () => {
    yggdrasil.repositories.files.get = sandbox.stub().resolves({
      body: {type: 'foo'}
    });

    const {res} = require('@unitTests/mocks/expressRes.stub')(sandbox, yggdrasil);

    const req = {
      method: 'get',
      params: {
        id: 'anId',
        type: 'bar'
      },
      yggdrasil
    };

    await handler(req, res);
    yggdrasil.repositories.files.get.should.have.been.calledOnce();
    res.status.should.have.been.calledWith(404);
    res.send.should.have.been.calledWith('Not Found');
  });

  it('should respond with 404 error if given id is unknown', async () => {
    yggdrasil.repositories.files.get = sandbox.stub().rejects();

    const {res} = require('@unitTests/mocks/expressRes.stub')(sandbox, yggdrasil);

    const req = {
      method: 'get',
      params: {
        id: 'anId',
        type: 'bar'
      },
      yggdrasil
    };

    await handler(req, res);
    yggdrasil.repositories.files.get.should.have.been.calledOnce();
    res.status.should.have.been.calledWith(404);
    res.send.should.have.been.calledWith('Not Found');
  });

  it('should respond with file content if type and id are ok', async () => {
    yggdrasil.repositories.files.get = sandbox.stub().resolves({
      body: {type: 'foo', mimeType: 'bar'}
    });

    const {res} = require('@unitTests/mocks/expressRes.stub')(sandbox, yggdrasil);

    const req = {
      method: 'get',
      params: {
        id: 'anId',
        type: 'foo'
      },
      yggdrasil
    };

    await handler(req, res);
    yggdrasil.repositories.files.get.should.have.been.calledOnce();
    res.setHeader.should.have.been.calledWith('content-type', 'bar');
    res.status.should.have.been.calledWith(200);
    res.sendFile.should.have.been.calledWith('FileContent');
  });

  it('should respond with file content as stream if type and id are ok and file is a stream', async () => {
    yggdrasil.repositories.files.get = sandbox.stub().resolves({
      body: {type: 'foo', mimeType: 'baz'}
    });

    const content = {
      pipe: sandbox.stub()
    };
    yggdrasil.repositories.files.getFile = sandbox.stub().returns({content, isStream: true});

    const {res} = require('@unitTests/mocks/expressRes.stub')(sandbox, yggdrasil);

    const req = {
      method: 'get',
      params: {
        id: 'anId',
        type: 'foo'
      },
      yggdrasil
    };

    await handler(req, res);
    yggdrasil.repositories.files.get.should.have.been.calledOnce();
    res.setHeader.should.have.been.calledWith('content-type', 'baz');
    res.status.should.have.been.calledWith(200);
    content.pipe.should.have.been.calledWith(res);
  });
});
