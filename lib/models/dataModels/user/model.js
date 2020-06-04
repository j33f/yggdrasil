/**
 * Minimal model for user
 *
 * Reminder : an object model should contain only relevant things like formats or required fields or uniqueness
 * The goal of this model is to check if the given object have the right format or not. It not aims to be exhaustive nor
 * authoritative for a full object, it is just a format validator for a minimal suitable workable object
 *
 **/

module.exports = {
  requiredIfCreatedVia: {
    default: [
      'identity.firstName',
      'identity.lastName',
      'contact.email',
      'contact.phones.mobile'
    ]
  }
};
