'use strict';

const
  Bluebird = require('bluebird');

module.exports = [
  /**
   * Get the current logged in user informations
   */
  {
    event: 'users/me', // the event name
    cb: (socket, yggdrasil, session, user, data, fn) => { // the default signature :
      // the socket, the yggdrasil, the retrieved session, the received data, the user, the received fn to execute on client side
      return yggdrasil.lib.controllers.users.me(yggdrasil, user)
        .then(result => {
          fn(result);
        })
        .catch(() => {
          socket.disconnect(true);
        });
    }
  },
  /**
   * Subscribe to rooms
   */
  {
    event: 'joinRooms', // the event name
    cb: (socket, yggdrasil, session, user, data) => { // the default signature :
      data.rooms.forEach(room => {
        socket.join(room);
      });
      return Bluebird.resolve();
    }
  },
  /**
   * Set the current user's client options / preferences from the client (front-end)
   */
  {
    event: 'users/me/setClientOption',
    cb: (socket, yggdrasil, session, user, data) => {
      return yggdrasil.lib.controllers.users.setClientOption(yggdrasil, session, user, data);
    }
  },
  /**
   * Get all the users
   */
  {
    event: 'users/all',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      if (data && data.query && data.paginate && data.lastId) {
        data.query._id = {
          '$gt': data.lastId
        };
        data.limit = 100;
      }

      return yggdrasil.lib.controllers.users.listAll(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Get users by data.key = value
   * For example : data = {key: 'policies', value: 'agent'}
   */
  {
    event: 'users/getByKeyValue',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      let queryData = {
        query: {}
      };
      queryData.query[data.key] = data.value;

      return yggdrasil.lib.controllers.users.list(yggdrasil, session, user, queryData)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Get a user with data.userId
   */
  {
    event: 'users/get',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.get(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Get the users model
   */
  {
    event: 'users/getModel',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.getModel(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Validate a new user with data.userId
   */
  {
    event: 'users/validateCreate',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.validateCreate(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Find duplicates users from a value (email, trigram, name...)
   */
  {
    event: 'users/findDupes',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.findDupes(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Create a new user
   */
  {
    event: 'users/create',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.create(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Update an existing user
   */
  {
    event: 'users/update',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.update(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Get user policies available
   */
  {
    event: 'users/getPolicies',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.getPolicies()
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * create temporary credentials for a particular user
   */
  {
    event: 'users/createTempCredentials',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.credentials.createTemp(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * create credentials for a particular user
   */
  {
    event: 'users/createCredentials',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.credentials.create(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * change the password of a user
   */
  {
    event: 'users/changePassword',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      const referer = new URL(socket.request.headers.referer);

      data.referer = referer.origin;
      return yggdrasil.lib.controllers.users.credentials.change(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Delete credentials for a particular user
   */
  {
    event: 'users/deleteCredentials',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.credentials.delete(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * Change a user's password and send him an email to reset it
   */
  {
    event: 'users/forcePasswordReset',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      const referer = new URL(socket.request.headers.referer);

      data.referer = referer.origin;
      data.ip = socket.handshake.address;

      return yggdrasil.lib.controllers.users.credentials.forceResetPassword(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * delete an attachment
   */
  {
    event: 'users/deleteAttachment',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      // the socket, the yggdrasil, the retrieved session, the received data, the user, the received fn to execute on client side
      return yggdrasil.lib.controllers.users.deleteAttachment(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * generate a password
   */
  {
    event: 'users/generatePassword',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      fn(yggdrasil.lib.utils.generatePassword());
    }
  },
  /**
   * delete a single user definitively
   */
  {
    event: 'users/delete',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.delete(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  },
  /**
   * delete the duplicates users based on a single user
   */
  {
    event: 'users/deleteOtherDupes',
    cb: (socket, yggdrasil, session, user, data, fn) => {
      return yggdrasil.lib.controllers.users.deleteOtherDupes(yggdrasil, session, user, data)
        .then(result => {
          fn(result);
        });
    }
  }
];
