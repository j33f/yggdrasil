const
  Bluebird = require('bluebird'),
  should = require('should'),
  sinon = require('sinon');

let controller = require('./filesController');

describe('Files controller', () => {
  describe('#topology', () => {
    it('should have the attachFileToObject method', () => {
      should(controller).have.ownProperty('attachFileToObject');
    });
  });

  describe('#attachFileToObject', () => {
    const
      objectTypes = ['foo', 'users'],
      fakeBasicYggdrasil = {
        lib: {
          controllers: {
            users: {
              get: sinon.fake.resolves({}),
              update: sinon.fake((yggdrasil, session, users, data) => {
                return Bluebird.resolve({documents: data.documents});
              }),
              addAttachment: sinon.fake((yggdrasil, session, users, data) => {
                return Bluebird.resolve({documents: data.attachmentIds || [data.attachmentId]});
              })
            },
            foo: {
              get: sinon.fake.resolves({}),
              update: sinon.fake((yggdrasil, session, users, data) => {
                return Bluebird.resolve({documents: data.documents});
              }),
              addAttachment: sinon.fake((yggdrasil, session, users, data) => {
                return Bluebird.resolve({documents: data.attachmentIds || [data.attachmentId]});
              })
            }
          }
        },
        repositories: {
          bar: {
            addAttachment: sinon.fake((id, data) => {
              return Bluebird.resolve({documents: data.attachmentIds || [data.attachmentId]});
            })
          }
        }
      };

    it('should reject if objectType is not one of ' + objectTypes.join(','), () => {
      should(controller.attachFileToObject({}, {}, {}, {objectType: 'badType', objectId: '666'}))
        .be
        .rejectedWith('Unknown object type badType');
    });

    ['foo', 'bar', 'users'].forEach(objectType => {
      it(`should resolve if objectType is ${objectType} and many attachments with the correct object`, () => {
        return controller.attachFileToObject(fakeBasicYggdrasil, {}, {}, {
          objectType: objectType,
          objectId: '666',
          attachmentIds: ['1337', '42']
        }).then(result => {
          should(result).have.ownProperty('documents');
          should(result.documents).containDeep(['1337', '42']);
        });
      });

      it(`should resolve if objectType is ${objectType} and one attachment with the correct object`, () => {
        return controller.attachFileToObject(fakeBasicYggdrasil, {}, {}, {
          objectType: objectType,
          objectId: '666',
          attachmentId: '666'
        })
          .then(result => {
            should(result).have.ownProperty('documents');
            should(result.documents).containDeep(['666']);
          });
      });
    });
  });
});