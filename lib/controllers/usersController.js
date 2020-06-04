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
 * @param user
 * @return {*|PromiseLike<T | never>|Promise<T | never>}
 */
controller.me = async (yggdrasil, user) => {
  await user.get();
  return pick(user, ['id', 'data']);
};

/**
 * Set options for the current authenticated user
 * @param yggdrasil
 * @param session
 * @param user
 * @param data
 * @return {*}
 */
controller.setClientOption = (yggdrasil, session, user, data) => {
  return user.set({
    preferences: {
      frontends: {
        crm: data
      }
    }
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

  const externalPolicies = ['anonymous', 'simple'];

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
        root: ['root', 'anonymous', 'simple']
      })) {
        authorizedCombination = true;
      }
    }
  }

  return authorizedCombination;
};

/**
 * Pick a user having the given query
 * @param yggdrasil
 * @param session
 * @param user
 * @param query{object}
 */
controller.pickOne = async (yggdrasil, session, user, query) => {
  let users = await controller.list(yggdrasil, session, user, {
    query: query
  });
  if (users && users.list && users.list.length > 0) {
    return users.list[Math.floor(Math.random() * users.list.length)];
  }
  yggdrasil.logger.error(`No user found for query ${query} when atempting to pick one`);
  return null;
};

/**
 * Lists users, filtered on given policy through data parameter, access limited through current user policy.
 * This function does not allow empty filter on policy except for policies 'salesManager', 'operationManager', 'generalManager', 'root'
 * @param yggdrasil
 * @param session
 * @param user
 * @param data: data.query.policies should be filled with a string with one of these values 'agent', 'intern', or 'businessProvider' to filter users on one policy
 * @returns {*}
 */
controller.list = async (yggdrasil, session, user, data) => {
  const users = await yggdrasil.repositories.users.list(data);
  return Bluebird.resolve({list:users});
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

  if (repoUser.policies) {
    // todo
  }

  // otherwise : no access
  return false;
};

controller.get = async (yggdrasil, session, user, data) => {
  const repoUser = await yggdrasil.repositories.users.get(data.userId || data.objectId);

  if (!controller.canAccessUser(yggdrasil, user, repoUser.body)) {
    // log combination and that is results to empty
    yggdrasil.logger.info('Users controller unauthorized on get user', data.userId, 'for user having policies', user.data.policies, 'for user', user.data.identity.lastName, 'user id', user.data._id);
    let err = new Error('User can\'t access this object because of its policies : [' + user.data.policies.join(', ') + ']');
    err.reason = 'FORBIDDEN';

    throw err;
  }

  return repoUser.body;
};

controller.set = (yggdrasil, session, user, data) => {
  if (!controller.canAccessUser(yggdrasil, user, data)) {
    yggdrasil.logger.info('Users controller unauthorized on set user', data, 'for user having policies', user.data.policies, 'for user', user.data.identity.lastName, 'user id', user.data._id);

    let err = new Error('User can\'t access this object because of its policies : [' + user.data.policies.join(', ') + ']');
    err.reason = 'FORBIDDEN';

    throw err;
  }
  return yggdrasil.repositories.users.set(data);
};

controller.create = (yggdrasil, session, user, data) => {
  if (!controller.canAccessUser(yggdrasil, user, data)) {
    yggdrasil.logger.info('Users controller unauthorized on create user', data, 'for user having policies', user.data.policies, 'for user', user.data.identity.lastName, 'user id', user.data._id);
    let err = new Error('User can\'t access this object because of its policies : [' + user.data.policies.join(', ') + ']');
    err.reason = 'FORBIDDEN';

    throw err;
  }
  return yggdrasil.repositories.users.create(data);
};

controller.findDupes = (yggdrasil, session, user, data) => {
  return yggdrasil.repositories.users.findDupes(data.value, data.type);
};

controller.update = (yggdrasil, session, user, data) => {
  if (!controller.canAccessUser(yggdrasil, user, data)) {
    yggdrasil.logger.info('Users controller unauthorized on update user', data, 'for user having policies', user.data.policies, 'for user', user.data.identity.lastName, 'user id', user.data._id);
    let err = new Error('User can not access this object because of its policies : [' + user.data.policies.join(', ') + ']');
    err.reason = 'FORBIDDEN';

    throw err;
  }
  return yggdrasil.repositories.users.update(data);
};

controller.getDistinct = (yggdrasil, session, user, data) => {
  return yggdrasil.repositories.users.getDistinct(data);
};

controller.getPolicies = async () => {
  return ['root', 'simple', 'anonymous'];
};

controller.getModel = (yggdrasil) => {
  return yggdrasil.repositories.users.getModel();
};

controller.credentials = {
  delete: (yggdrasil, session, user, data) => {
    return yggdrasil.repositories.credentials.deleteForUserId(data.userId);
  },
  create: (yggdrasil, session, user, data) => {
    return yggdrasil.repositories.credentials.createForUserId(data.userId, data.password, data.sendPassword);
  },
  change: (yggdrasil, session, user, data) => {
    return yggdrasil.repositories.credentials.changePasswordForUserId(data.userId, data.password, data.referer, data.sendPassword);
  },
  createTemp: (yggdrasil, session, user, data) => {
    return yggdrasil.repositories.credentials.createTemporaryForId(data.userId);
  },
  resetPasswordWithKey: (yggdrasil, data) => {
    return yggdrasil.repositories.credentials.resetPasswordWithKey(data.key, data.email, data.password);
  },
  passwordChangeRequest: (yggdrasil, email, ip) => {
    return yggdrasil.repositories.credentials.passwordChangeRequestFromEmail(email, ip);
  },
  forceResetPassword: (yggdrasil, session, user, data) => {
    return yggdrasil.repositories.credentials.passwordChangeRequestFromId(data.userId, data.ip, data.referer);
  }
};
/**
 * Attach a file to a user depending on its type
 * @param yggdrasil
 * @param session
 * @param user
 * @param data
 * @returns {Promise<{documents: (string)[]}|{documents: (Array|string[])}>}
 */
controller.addAttachment = async (yggdrasil, session, user, data) => {
  let object = await controller.get(yggdrasil, session, user, data);

  object.communication = object.communication || {
    photo: null,
    background: null
  };

  object.documents = object.documents || [];

  switch (data.fileType) {
    case 'userAvatar':
      object.communication.photo = data.attachmentId || data.attachmentIds[0];
      break;
    case 'userBackground':
      object.communication.background = data.attachmentId || data.attachmentIds[0];
      break;
    default:
      // only one attachment: push, many attachments : concat with the current documents array into the object
      if (data.attachmentId) {
        object.documents.push(data.attachmentId);
      }
      if (data.attachmentIds) {
        object.documents = object.documents.concat(data.attachmentIds);
      }
  }

  // update user with a new attachment
  await yggdrasil.lib.controllers.users.update(yggdrasil, session, user, object);
  // resolve the promise with sent attachment(s)
  if (data.attachmentId) {
    return {documents: [data.attachmentId]};
  }
  if (data.attachmentIds) {
    return {documents: data.attachmentIds};
  }
};

/**
 * Delete an attachment file
 * @param yggdrasil
 * @param session
 * @param user
 * @param data
 * @returns {Promise<void>}
 */
controller.deleteAttachment = async (yggdrasil, session, user, data) => {
  let repoUser = await controller.get(yggdrasil, session, user, data);
  let userObject = repoUser.body;

  if (userObject && userObject.documents) {
    if (userObject.documents.includes(data.attachmentId)) {
      await yggdrasil.repositories.files.delete(data.attachmentId);
    }
  }

  yggdrasil.logger.warn('Attempt to delete file #' + data.attachmentId + ' but it not belongs to user #' + data.userId);

  userObject.documents = userObject.documents.filter(s => s !== data.attachmentId);
  return controller.update(yggdrasil, session, user, userObject);
};

/**
 * delete a single user
 * @param yggdrasil
 * @param session
 * @param user
 * @param data should contain a _id
 * @returns {*|PromiseLike<T | never>|Promise<T | never>}
 */
controller.delete = async (yggdrasil, session, user, data) => {
  const repoUser = await controller.get(yggdrasil, session, user, data);

  if (controller.canAccessUser(yggdrasil, user, repoUser)) {
    return yggdrasil.repositories.users.delete(data._id);
  }
  throw new Error('You cannot delete this user');
};

/**
 * delete a bunch of user which are the duplicates of the given user
 * @param yggdrasil
 * @param session
 * @param user
 * @param data should contain a _id
 * @returns {*|PromiseLike<T | never>|Promise<T | never>}
 */
controller.deleteOtherDupes = (yggdrasil, session, user, data) => {
  let promises = [];
  promises.push(controller.findDupes(yggdrasil, session, user, {
    value: yggdrasil.lib.utils.format.email(data.user.contact.email),
    type: 'email'
  }));
  if (yggdrasil.lib.utils.format.phone(data.user.contact.phones.mobile)) {
    promises.push(controller.findDupes(yggdrasil, session, user, {
      value: yggdrasil.lib.utils.format.phone(data.user.contact.phones.mobile),
      type: 'phone'
    }));
  }
  if (yggdrasil.lib.utils.format.phone(data.user.contact.phones.office)) {
    promises.push(controller.findDupes(yggdrasil, session, user, {
      value: yggdrasil.lib.utils.format.phone(data.user.contact.phones.office),
      type: 'phone'
    }));
  }
  if (yggdrasil.lib.utils.format.trigram(data.user.identity.trigram)) {
    promises.push(controller.findDupes(yggdrasil, session, user, {
      value: yggdrasil.lib.utils.format.trigram(data.user.identity.trigram),
      type: 'trigram'
    }));
  }
  return Bluebird.all(promises)
    .then(results => {
      promises = [];

      [...new Set([].concat(...results.map(s=>{return s.list;})))] // concat lists
        .filter(u => {
          // remove users which are the same as the user we are comparing to and user which I can't access
          // because of my and its policies
          return (u._id !== data.user._id && controller.canAccessUser(yggdrasil, user, u));
        })
        .forEach(u => {
          // delete each accounts
          promises.push(yggdrasil.repositories.users.delete(u._id));
        });

      return Bluebird.all(promises)
        .then(responses => {
          console.log(responses.length, responses);
          return Bluebird.resolve(responses);
        });
    });
};

module.exports = controller;
