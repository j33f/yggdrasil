module.exports = {
  'tree': { // the policies hierarchy, each parent will have rights on children and objects created by children
    'root': {
      'powerUsers': {},
      'simpleUsers': {},
      'anonymous': null
    }
  },
  'rules': {
    /**
     * The rules to apply to the various business object types (or repositories)
     *
     * A rule is a set of actions/verbs associated to an array representing who can perform this thing action
     * Each rule are applied to a user having this policy or its owner.
     *
     * The associated array to each action, can contain :
     * - owner: the object owner aka the one user referenced in it (like in userId property)
     * - parent: a user having a policy which is a parent or the object owner's policy
     * - creator: the user who have created the object
     * - same: a user having the same policy as the owner
     * - child: a user having a policy which is a child from the object owner's policy
     */
    'types': {
      'auth': { // auth repository
        '*': { // these rules are applied to all policies
          'create': ['owner'], //
          'read': ['owner'],
          'update': ['owner'],
          'delete': ['owner'],
          'list': ['owner'],
          'search': ['owner']
        }
      },
      'users': {
        '*': {
          'create': ['parent'],
          'read': ['parent','owner', 'creator'],
          'update': ['parent','owner', 'creator'],
          'delete': ['parent', 'creator'],
          'list': ['parent', 'child', 'same', 'creator'],
          'search': ['parent', 'same', 'creator']
        },
        'simpleUsers': { // when the user have this policy and its children
          'create': ['powerUsers'],
          'read': ['owner', 'creator'],
          'update': ['owner', 'creator'],
          'delete': ['owner', 'creator'],
          'list': ['owner', 'creator'],
          'search': ['owner', 'creator']
        },
        'powerUsers': {
          'create': ['parent'],
          'read': ['parent', 'same', 'creator'],
          'update': ['parent', 'creator'],
          'delete': ['owner', 'creator'],
          'list': ['owner', 'creator'],
          'search': ['owner', 'creator']
        }
      },
      'files': {
        '*': {
          'create': ['powerUsers', 'simpleUsers'],
          'read': ['owner', 'creator'],
          'update': ['owner', 'creator'],
          'delete': ['owner', 'creator'],
          'list': ['owner', 'creator', 'powerUsers'],
          'search': ['owner', 'creator', 'powerUsers']
        }
      }
    },
    'subObjects': {
      /**
       * Rules applying to sub-objects of an object.
       * for example, a user can have a "identity" sub-object in it and we may want all other users to be allowed to see
       * it. Same with contact information, etc.
       */
      'users': {
        'identity': ['parent', 'owner', 'child'],
        'contact': ['parent', 'owner', 'child']
      }
    }
  }
};