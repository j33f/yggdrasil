'use strict';

const Bluebird = require('bluebird');
const { pick } = require('lodash');

let controller = {};

/**
 * Test if userPolicy is compatible with queryPolicies
 * @param userPolicies
 * @param queryPolicies
 * @returns {function(*=): boolean}
 */
const combinationMatcher = (userPolicies, queryPolicies) => rules =>
  Object.entries(rules).some(
    ([policy, allowed]) => userPolicies.includes(policy) && allowed.includes(queryPolicies)
  );

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
 * @param user
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
 * @param user
 * @param {object} data - contains initial query
 * @returns {boolean} - true when current user is allowed to access what asked in query
 */
controller.canList = (user, data) => {
  const directionPolicies = ['root'];

  const internalPolicies = [
    'root'
  ];

  const externalPolicies = ['anonymous', 'invited'];

  let
    canList = (internalPolicies.filter(policy => user.data.policies.includes(policy)).length > 0 || externalPolicies.filter(policy => user.data.policies.includes(policy)).length > 0), // if the user have none of those policies, he cannot list other users (excepted customers)
    authorizedCombination = (directionPolicies.filter(policy => user.data.policies.includes(policy)).length > 0), //tells if current user policy matches policy from query: true when connected user can list users requested policy
    matches;

  data.query = data.query || {};
  // Directors (CEO, COO, CCO) and root can list every users, thus no need to check policy queried.
  // In the other case, authorizedCombination is false until a user policy match is found.
  // This block checks if current user policy matches policy from query.
  if (canList && !authorizedCombination && data.query.policies) {
    data.query.policies = data.query.policies.trim();
    if (data.query.policies.length > 0) {
      matches = combinationMatcher(user.data.policies, data.query.policies);

      if (matches({
        root: ['root', 'anonymous', 'invited']
      })) {
        authorizedCombination = true;
      }
    }
  }

  return authorizedCombination;
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
  yggdrasil.logger.error(`No user found for query ${query} when attempting to pick one`);
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
    let response = [];
    result.list.forEach(user => {
      if (controller.canAccessUser(yggdrasil, session.user, user)) {
        response.push(user);
      }
    });
    return {
      list: response,
      missingFromAccessRights: result.list.length - response.length
    };
  });
};

/**
 * Checks if current user can access a given user from repository
 * @param yggdrasil
 * @param {object} user - currently connected user
 * @param {object} repoUser - repository user
 * @returns {boolean} - true when current user is allowed to access repository user information
 */
controller.canAccessUser = (yggdrasil, user, repoUser) => {
  // root can access to everyone
  if (user.data.policies.includes('root')) {
    return true;
  }
  if (user.data.policies[0] === 'anonymous' || user.data.policies.length === 0) {
    return false;
  }

  if (repoUser.policies) {
    // todo
  }

  // otherwise : no access
  return false;
};

controller.get = async (yggdrasil, session, data) => {
  const userId = data.objectId || data.userId || data;
  if (userId === session.userId) {
    return controller.me(yggdrasil, session);
  }

  const repoUser = await yggdrasil.repositories.users.get(userId);

  if (!controller.canAccessUser(yggdrasil, session.user, repoUser.body)) {
    // log combination and that is results to empty
    const errorMessage = `${session.userId}, having policies ${JSON.stringify(session.user.data.policies)} is not allowed to access to user ${repouser.data._id} having policies ${JSON.stringify(repoUser.data.policies)}`;
    yggdrasil.logger.warn(errorMessage);
    let err = new Error(errorMessage);
    err.reason = 'FORBIDDEN';
    throw err;
  }

  return repoUser.body;
};

controller.set = (yggdrasil, session, data) => {
  if (!controller.canAccessUser(yggdrasil, session.user, data)) {
    const errorMessage = `${session.userId}, having policies ${JSON.stringify(session.user.data.policies)} is not allowed to set user data ${data}`;
    yggdrasil.logger.warn(errorMessage);
    let err = new Error(errorMessage);
    err.reason = 'FORBIDDEN';
    throw err;
  }
  return yggdrasil.repositories.users.set(data);
};

controller.create = (yggdrasil, session, data) => {
  if (!controller.canAccessUser(yggdrasil, session.user, data)) {
    const errorMessage = `${session.userId}, having policies ${JSON.stringify(session.user.data.policies)} is not allowed to create user data ${data}`;
    yggdrasil.logger.warn(errorMessage);
    let err = new Error(errorMessage);
    err.reason = 'FORBIDDEN';
    throw err;
  }
  return yggdrasil.repositories.users.create(data);
};

controller.findDupes = (yggdrasil, session, data) => {
  return yggdrasil.repositories.users.findDupes(data.value, data.type)
    .then(result => {
      let response = [];
      result.list.forEach(user => {
        if (controller.canAccessUser(yggdrasil, session.user, user)) {
          response.push(user);
        }
      });
      return {
        list: response,
        missingFromAccessRights: result.list.length - response.length
      };
    });
};

controller.update = (yggdrasil, session, data) => {
  const userId = data.objectId || data.userId || data;

  if (!controller.canAccessUser(yggdrasil, session.user, data)) {
    const errorMessage = `${session.userId}, having policies ${JSON.stringify(session.user.data.policies)} is not allowed to update user ${userId} having policies ${JSON.stringify(data.policies)}`;
    yggdrasil.logger.info(errorMessage);
    let err = new Error(errorMessage);
    err.reason = 'FORBIDDEN';
    throw err;
  }
  return yggdrasil.repositories.users.update(data);
};

controller.getDistinct = (yggdrasil, session, data) => {
  return yggdrasil.repositories.users.getDistinct(data);
};

controller.getPolicies = async () => {
  return ['root', 'simple', 'anonymous']; // todo refactor
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
  const userId = data.objectId || data.userId || data;

  let repoUser = await controller.get(yggdrasil, session, data);
  let userObject = repoUser.body;

  if (userObject && userObject.documents) {
    if (userObject.documents.includes(data.attachmentId)) {
      await yggdrasil.repositories.files.delete(data.attachmentId);
    }
  }

  yggdrasil.logger.warn('Attempt to delete file #' + data.attachmentId + ' but it not belongs to user #' + data.userId);

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
  const userId = data.objectId || data.userId || data;

  const repoUser = await controller.get(yggdrasil, session, data);

  if (userId === session.userId) {
    const errorMessage = `${session.userId} cannot delete itself`;
    yggdrasil.logger.info(errorMessage);
    let err = new Error(errorMessage);
    err.reason = 'FORBIDDEN';
    throw err;
  }

  if (controller.canAccessUser(yggdrasil, user, repoUser)) {
    return yggdrasil.repositories.users.delete(userId);
  }
  const errorMessage = `${session.userId}, having policies ${JSON.stringify(session.user.data.policies)} is not allowed to delete user ${repouser.data._id} having policies ${JSON.stringify(repoUser.data.policies)}`;
  yggdrasil.logger.info(errorMessage);
  let err = new Error(errorMessage);
  err.reason = 'FORBIDDEN';
  throw err;
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
          return (u._id !== data.user._id && controller.canAccessUser(yggdrasil, session.user, u));
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
