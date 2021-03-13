'use strict';

const Bluebird = require('bluebird');
const { pick } = require('lodash');

let controller = {};

/**
 * Reduce a list of users depending if the current user can access them
 * @param result
 * @param yggdrasil
 * @param session
 * @returns {{missingFromAccessRights: number, list: Array}}
 */
const reduceList = (result, yggdrasil, session) => {
  let response = [];
  result.list.forEach(user => {
    if (session.user.can('read', 'users', user)) {
      response.push(user);
    }
  });
  return {
    list: response,
    missingFromAccessRights: result.list.length - response.length
  };
};
/**
 * Get myself as an authenticated user
 * @param yggdrasil
 * @param session
 * @return {*|PromiseLike<T | never>|Promise<T | never>}
 */
controller.me = async (yggdrasil, session) => {
  return pick(session.user, ['id', 'data']);
};

/**
 * Set options for the current authenticated user
 * @param yggdrasil
 * @param session
 * @param data
 * @return {*}
 */
controller.setClientOption = (yggdrasil, session, data) => {
  return session.user.set({
    preferences: data
  });
};

/**
 * Builds query for user list filtering telling if the user can list the requested users
 *
 * @param yggdrasil
 * @param session
 * @param data
 * @returns {boolean}
 */
controller.canList = async (yggdrasil, session, data) => {
  return session.user.canListUsers(data);
};

/**
 * Pick a random user depending on a query
 * @param yggdrasil
 * @param session
 * @param query{object}
 */
controller.pickOne = async (yggdrasil, session, query) => {
  let users = await controller.list(yggdrasil, session, {
    query: query
  });
  if (users && users.list && users.list.length > 0) {
    return users.list[Math.floor(Math.random() * users.list.length)];
  }
  yggdrasil.fire('log', 'error', `No user found for query ${query} when attempting to pick one`);
  return null;
};

/**
 * Lists users, filtered on given policy through data parameter, access limited through current user policy.
 * This function does not allow empty filter on policy except for policies 'salesManager', 'operationManager', 'generalManager', 'root'
 * @param yggdrasil
 * @param session
 * @param data: data.query.policies should be filled with a string with one of these values 'agent', 'intern', or 'businessProvider' to filter users on one policy
 * @returns {*}
 */
controller.list = (yggdrasil, session, data) => {
  return yggdrasil.repositories.users.list(data)
    .then(result => {
      return reduceList(result, yggdrasil, session);
    });
};

controller.get = async (yggdrasil, session, data) => {
  const userId = data.objectId || data.userId || data;
  if (userId === session.userId) {
    return controller.me(yggdrasil, session);
  }

  const repoUser = await yggdrasil.repositories.users.get(userId);

  if (!session.user.can('read', 'users', repoUser)) {
    // log combination and that is results to empty
    const errorMessage = `${session.userId}, having policies ${JSON.stringify(session.user.data.policies)} is not allowed to access to user ${repoUser.data._id} having policies ${JSON.stringify(repoUser.body.policies)}`;
    yggdrasil.fire('log', 'warn', errorMessage);
    let err = new Error(errorMessage);
    err.reason = 'FORBIDDEN';
    throw err;
  }

  return repoUser.body;
};

controller.update = (yggdrasil, session, data) => {
  const userId = data.objectId || data.userId || data._id;

  if (!session.user.can('update', 'users', data)) {
    const errorMessage = `${session.userId}, having policies ${JSON.stringify(session.user.data.policies)} is not allowed to update user ${userId} having policies ${JSON.stringify(data.policies)}`;
    yggdrasil.fire('log', 'info', errorMessage);
    let err = new Error(errorMessage);
    err.reason = 'FORBIDDEN';
    throw err;
  }
  return yggdrasil.repositories.users.update(data);
};

controller.create = (yggdrasil, session, data) => {
  if (!session.user.can('create', 'users', data)) {
    const errorMessage = `${session.userId}, having policies ${JSON.stringify(session.user.data.policies)} is not allowed to create user data ${data}`;
    yggdrasil.fire('log', 'warn', errorMessage);
    let err = new Error(errorMessage);
    err.reason = 'FORBIDDEN';
    throw err;
  }
  return yggdrasil.repositories.users.create(data);
};

controller.findDupes = (yggdrasil, session, data) => {
  return yggdrasil.repositories.users.findDupes(data.value, data.type)
    .then(result => {
      return reduceList(result, yggdrasil, session);
    });
};

controller.getDistinct = (yggdrasil, session, data) => {
  return yggdrasil.repositories.users.getDistinct(data);
};

controller.getPolicies = async () => {
  return this.yggdrasil.policies.list;
};

controller.getModel = async (yggdrasil) => {
  return yggdrasil.repositories.users.model;
};

/**
 * Delete an attachment file
 * @param yggdrasil
 * @param session
 * @param data
 * @returns {Promise<void>}
 */
controller.deleteAttachment = async (yggdrasil, session, data) => {
  // capability check is made at controller.get
  const repoUser = await controller.get(yggdrasil, session, data);
  const userObject = repoUser.body;

  if (userObject && userObject.documents) {
    if (userObject.documents.includes(data.attachmentId)) {
      await yggdrasil.repositories.files.delete(data.attachmentId);
    }
  }

  yggdrasil.fire('log', 'warn', 'Attempt to delete file #' + data.attachmentId + ' but it not belongs to user #' + data.userId);

  userObject.documents = userObject.documents.filter(s => s !== data.attachmentId);
  return controller.update(yggdrasil, session, userObject);
};

/**
 * delete a single user
 * @param yggdrasil
 * @param session
 * @param data should contain a _id
 * @returns {*|PromiseLike<T | never>|Promise<T | never>}
 */
controller.delete = async (yggdrasil, session, data) => {
  const userId = data.objectId || data.userId || data._id;

  await controller.get(yggdrasil, session, data);

  let errorMessage, error;

  if (userId === session.userId) {
    errorMessage = `${session.userId} cannot delete itself`;
    yggdrasil.fire('log', 'info', errorMessage);
    error = new Error(errorMessage);
    error.reason = 'FORBIDDEN';
    throw error;
  }

  return yggdrasil.repositories.users.delete(userId);
};

/**
 * delete a bunch of user which are the duplicates of the given user
 * @param yggdrasil
 * @param session
 * @param data should contain a _id
 * @returns {*|PromiseLike<T | never>|Promise<T | never>}
 */
controller.deleteOtherDupes = (yggdrasil, session, data) => {
  let promises = [];
  promises.push(controller.findDupes(yggdrasil, session, {
    value: yggdrasil.lib.utils.format.email(data.user.contact.email),
    type: 'email'
  }));
  if (yggdrasil.lib.utils.format.phone(data.user.contact.phones.mobile)) {
    promises.push(controller.findDupes(yggdrasil, session,{
      value: yggdrasil.lib.utils.format.phone(data.user.contact.phones.mobile),
      type: 'phone'
    }));
  }
  if (yggdrasil.lib.utils.format.phone(data.user.contact.phones.office)) {
    promises.push(controller.findDupes(yggdrasil, session,{
      value: yggdrasil.lib.utils.format.phone(data.user.contact.phones.office),
      type: 'phone'
    }));
  }
  if (yggdrasil.lib.utils.format.trigram(data.user.identity.trigram)) {
    promises.push(controller.findDupes(yggdrasil, session, {
      value: yggdrasil.lib.utils.format.trigram(data.user.identity.trigram),
      type: 'trigram'
    }));
  }
  return Bluebird.all(promises)
    .then(results => {
      promises = [];

      [...new Set([].concat(...results.map(s=>{return s.list;})))] // concat lists
        .filter(u => {
          return (u._id !== data.user._id && session.user.canAccessUser(u));
        })
        .forEach(u => {
          // delete each accounts
          promises.push(controller.delete(yggdrasil, session, u._id));
        });

      return Bluebird.all(promises)
        .then(responses => {
          return Bluebird.resolve(responses);
        });
    });
};

module.exports = controller;
