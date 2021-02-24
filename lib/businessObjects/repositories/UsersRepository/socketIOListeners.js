'use strict';

module.exports = [
  /**
   * Get the current logged in user informations
   */
  {
    event: 'users/me', // the event name
    cb: async (socket, yggdrasil, session, user, data, fn) => { // the default signature :
      // the socket, the yggdrasil, the retrieved session, the received data, the user, the received fn to execute on client side
      try {
        fn(await yggdrasil.lib.controllers.users.me(yggdrasil, user));
      } catch(e) {
        socket.disconnect(true);
      }
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
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      if (data && data.query && data.paginate && data.lastId) {
        data.query._id = {
          '$gt': data.lastId
        };
        data.limit = 100;
      }

      fn(await yggdrasil.lib.controllers.users.listAll(yggdrasil, session, user, data));
    }
  },
  /**
   * Get users by data.key = value
   * For example : data = {key: 'policies', value: 'agent'}
   */
  {
    event: 'users/getByKeyValue',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      let queryData = {
        query: {}
      };
      queryData.query[data.key] = data.value;

      fn(await yggdrasil.lib.controllers.users.list(yggdrasil, session, user, queryData));
    }
  },
  /**
   * Get a user with data.userId
   */
  {
    event: 'users/get',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.get(yggdrasil, session, user, data));
    }
  },
  /**
   * Get the users model
   */
  {
    event: 'users/getModel',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.getModel(yggdrasil, session, user, data));
    }
  },
  /**
   * Validate a new user with data.userId
   */
  {
    event: 'users/validateCreate',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.validateCreate(yggdrasil, session, user, data));
    }
  },
  /**
   * Find duplicates users from a value (email, trigram, name...)
   */
  {
    event: 'users/findDupes',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.findDupes(yggdrasil, session, user, data));
    }
  },
  /**
   * Create a new user
   */
  {
    event: 'users/create',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.create(yggdrasil, session, user, data));
    }
  },
  /**
   * Update an existing user
   */
  {
    event: 'users/update',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.update(yggdrasil, session, user, data));
    }
  },
  /**
   * Get user policies available
   */
  {
    event: 'users/getPolicies',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.getPolicies());
    }
  },
  /**
   * Delete all credentials for a particular user
   */
  {
    event: 'users/delCredentials',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.credentials.delete(yggdrasil, session, user, data));
    }
  },
  /**
   * create temporary credentials for a particular user
   */
  {
    event: 'users/createTempCredentials',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.credentials.createTemp(yggdrasil, session, user, data));
    }
  },
  /**
   * create credentials for a particular user
   */
  {
    event: 'users/createCredentials',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.credentials.create(yggdrasil, session, user, data));
    }
  },
  /**
   * change the password of a user
   */
  {
    event: 'users/changePassword',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      const referer = new URL(socket.request.headers.referer);

      data.referer = referer.origin;
      fn(await yggdrasil.lib.controllers.users.credentials.change(yggdrasil, session, user, data));
    }
  },
  /**
   * Delete credentials for a particular user
   */
  {
    event: 'users/deleteCredentials',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.credentials.delete(yggdrasil, session, user, data));
    }
  },
  /**
   * Change a user's password and send him an email to reset it
   */
  {
    event: 'users/forcePasswordReset',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      const referer = new URL(socket.request.headers.referer);

      data.referer = referer.origin;
      data.ip = socket.handshake.address;

      fn(await yggdrasil.lib.controllers.users.credentials.forceResetPassword(yggdrasil, session, user, data));
    }
  },
  /**
   * delete an attachment
   */
  {
    event: 'users/deleteAttachment',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      // the socket, the yggdrasil, the retrieved session, the received data, the user, the received fn to execute on client side
      fn(await yggdrasil.lib.controllers.users.deleteAttachment(yggdrasil, session, user, data));
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
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.delete(yggdrasil, session, user, data));
    }
  },
  /**
   * delete the duplicates users based on a single user
   */
  {
    event: 'users/deleteOtherDupes',
    cb: async (socket, yggdrasil, session, user, data, fn) => {
      fn(await yggdrasil.lib.controllers.users.deleteOtherDupes(yggdrasil, session, user, data));
    }
  }
];