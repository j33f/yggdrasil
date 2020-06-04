'use strict';

let controller = {};

/**
 * Attach a file to a business object (project, mission, property atm)
 *
 * data should have
 * - an objectType member with a value of 'project', 'mission' or 'property'
 * - an objectId member set to the object id to attach a file to
 *
 * for a property, the objectId is like {missionId}_propertyId_{property.reference}
 *
 * @param yggdrasil
 * @param session
 * @param user
 * @param data should have an objectType member with a value of one of the repositories
 * @returns {Promise<*|*|undefined>}
 */
controller.attachFileToObject = async (yggdrasil, session, user, data) => {
  // set the id of the object to retrieve depending on its type
  data[data.objectType + 'Id'] = data.objectId;

  // retrieve the object
  if (yggdrasil.lib.controllers[data.objectType] && yggdrasil.lib.controllers[data.objectType].addAttachment) {
    // if is there a controller for this object type with the right methods to handle a file attachment...
    return await yggdrasil.lib.controllers[data.objectType].addAttachment(yggdrasil, session, user, data);
  } else if (yggdrasil.repositories[data.objectType]) {
    // there is no specific controller to handle file attachment, if there is a repository, attach the file with the default repository method
    return yggdrasil.repositories[data.objectType].addAttachment(data.objectId, data);
  }

  throw new Error('Unknown object type ' + data.objectType);
};

module.exports = controller;
