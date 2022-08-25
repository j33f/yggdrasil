/*
 * Copyright 2020 Jean-François Vial
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

require('module-alias/register');

const sinon = require('sinon');
const should = require('should');
require('should-sinon');

const sandbox = sinon.createSandbox();

let yggdrasil;

const route = require('./post');
const handler = route.stack[0].handle;

describe('Files Repository > Routes > post', () => {
  beforeEach(() => {
    yggdrasil = {
      uuid: sandbox.stub().returns('uuid'),
      logger: require('@unitTests/mocks/logger.stub')(sandbox),
      events: require('@unitTests/mocks/eventsService.stub')(sandbox),
      repositories: {
        files: {
          set: sandbox.stub().resolves({
            metadata: {
              _id: 'id'
            }
          })
        },
        fake: {
          addAttachment: sandbox.stub().resolves({
            metadata: {
              _id: 'id'
            },
            documents: ['documents']
          })
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

  it('should respond with a 501 error if the given object type is unknown', async () => {
    const req = {
      method: 'post',
      params: {
        objectType: 'unknown'
      }
    };

    const {res} = require('@unitTests/mocks/expressRes.stub')(sandbox, yggdrasil);

    await handler(req, res);
    res.status.should.have.been.calledWith(501);
    res.json.should.have.been.calledWith({
      status: 501,
      message: 'Not implemented',
      details: 'The given object type unknown does not exists. The attachment(s) cannot be attached to any object thus they have not been uploaded.'
    });
  });

  it('should respond with a 201 status if the given object type is known', async () => {
    const req = {
      method: 'post',
      session: {
        userId: 'userId'
      },
      params: {
        objectType: 'fake',
        objectId: 'fakeId',
        fileType: 'fakeType'
      },
      files: {
        aFile: {
          name: 'aFile.txt',
          mimetype: 'text/plain',
          data: 'aFileData'
        }
      }
    };

    const {res} = require('@unitTests/mocks/expressRes.stub')(sandbox, yggdrasil);

    await handler(req, res);
    yggdrasil.repositories.files.set.should.have.been.calledWith(
      {
        displayName: 'uuid.txt',
        mimeType: 'text/plain',
        userId: 'userId',
        type: 'fakeType',
        description: 'aFile.txt'
      },
      'uuid',
      null,
      'aFileData'
    );

    yggdrasil.repositories.fake.addAttachment.should.have.been.calledWith(
      'fakeId',
      {attachmentIds: ['id']}
    );
    //res.status.should.have.been.calledWith(201);
  });
});
