'use strict';

const
  Repository = require('./Repository'),
  Bluebird = require('bluebird'),
  {compact, castArray} = require('lodash');

class UsersRepository extends Repository {

  constructor (yggdrasil) {
    super('Users', 'users', 'data', yggdrasil);
    this.model = require('../dataModels/user/model');
  }

  /**
   * Augment the user data with credentials data if any
   * @param id
   * @param nocache
   * @returns {*}
   */
  get (id, nocache = false) {
    return super.get(id, nocache)
      .then(user => {
        return this.yggdrasil.repositories.credentials.getForUserId(user.body._id)
          .then(credentials => {
            user.body.credentials = credentials;
            return Bluebird.resolve(user);
          })
          .catch(() => {
            return Bluebird.resolve(user);
          });
      });
  }

  // tmp fake data for fund brokers, waiting implement in import todo remove after
  // to import as a standard user with a (new?) role fundbroker
  fundBrokerFakeList () {
    /*  const  fundBrokerNetworks = [
              {order: 1, name: 'CAFPI'},
              {order: 2, name: 'MEILLEUR TAUX'},
              {order: 3, name: 'ONE TAUX'},
              {order: 4, name: 'ACE'},
              {order: 5, name: 'INANDFI'},
              {order: 6, name: 'IT PRET'},
              {order: 7, name: 'EMPRUNTIS'},
              {order: 8, name: 'CHEVAL BLANC PATRIMOINE'},
              {order: 9, name: 'CENTRALE DE FINANCEMENT'},
              {order: 10, name: 'CARTE FINANCEMENT (EXPAT)'},
              {order: 11, name: 'VOUSFINANCER'},
              {order: 12, name: 'PERSONA COURTAGE'}
            ];*/

    return Bluebird.resolve (
      {
        list:
          [
            {
              agent: {
                _id: 'djhg54fqs1',
                order: 1,
                firstName: 'Jean-Sébastien',
                lastName:'Barre',
                email: 'jsb.montpellier@cafpipi.frfrfr',
                phone: '+3336874524857'
              },
              network: {
                _id: '1',
                order: 1,
                name: 'CAFPI'
              },
              location: {
                zipCode: '34000',
                town: 'Montpellier'
              }
            },
            {
              agent: {
                _id: 'djhg454fqs2',
                order: 2,
                firstName: 'Jean-Marc',
                lastName:'Barré',
                email: 'jmb.montpellier@cafpipi.frfrfr',
                phone: '+3336854524857'
              },
              network: {
                _id: '1',
                order: 1,
                name: 'CAFPI'
              },
              location: {
                zipCode: '34000',
                town: 'Montpellier'
              }
            },
            {
              agent: {
                _id: 'djhg54fq56s3',
                order: 1,
                firstName: 'Jean-Loup',
                lastName:'Chrétien',
                email: 'jlc.bordeaux@1.toto',
                phone: '+3336874524857'
              },
              network: {
                _id: 'ajhf3',
                order: 3,
                name: 'ONE TAUX'
              },
              location: {
                zipCode: '33000',
                town: 'Bordeaux'
              }
            },
            {
              agent: {
                _id: 'djhg54fqs4',
                order: 1,
                firstName: 'Robert',
                lastName:'Fordrouge',
                email: 'rfr.montpellier@mt.frfrfr',
                phone: '+3336874524857'
              },
              network: {
                _id: '2',
                order: 1,
                name: 'MEILLEUR TAUX'
              },
              location: {
                zipCode: '34000',
                town: 'Montpellier'
              }
            },
            {
              agent: {
                _id: 'djhg454fqs5',
                order: 2,
                firstName: 'Alain',
                lastName:'Voulzy',
                email: 'av.montpellier@mt.frfrfr',
                phone: '+3336854524857'
              },
              network: {
                _id: '2',
                order: 1,
                name: 'MEILLEUR TAUX'
              },
              location: {
                zipCode: '34000',
                town: 'Montpellier'
              }
            },
            {
              agent: {
                _id: 'djhg54fq56s6',
                order: 1,
                firstName: 'Anna',
                lastName:'Belle',
                email: 'ab.bordeaux@mt.frfrfr',
                phone: '+3336874524857'
              },
              network: {
                _id: '2',
                order: 1,
                name: 'MEILLEUR TAUX'
              },
              location: {
                zipCode: '33000',
                town: 'Bordeaux'
              }
            }
          ]
      }
    );
  }

  /**
   * Remove any credentials reference is any before to set
   * @param body
   * @param id
   * @returns {*}
   */
  set (body, id) {
    if (body.credentials) {
      delete body.credentials;
    }
    return super.set(body, id);
  }

  /**
   * Augment the users data with credentials data if any
   *
   * @param params
   */
  list (params) {
    //fake data tmp for fund brokers
    if (params.query && params.query.policies === 'fundBroker') {
      return this.fundBrokerFakeList();
    }
    return super.list(params)
      .then(users => {
        return Bluebird.map(users.list, user => {
          return this.yggdrasil.repositories.credentials.getForUserId(user._id)
            .then(credentials => {
              user.credentials = credentials;
              return Bluebird.resolve(user);
            })
            .catch(() => {
              return Bluebird.resolve(user);
            });
        })
          .then(mapResult => {
            return Bluebird.resolve({
              list: compact(mapResult)
            });
          });
      });
  }

  /**
   * Find objects sharing the same data depending on the type
   * @param value = the value to find
   * @param type - what type of property do we have to check
   * @returns {Promise<Array>} the found objects list
   */
  findDupes (value, type) {
    let keys = '';

    if (!value) {
      // we have no value to check : nothing to find
      return Bluebird.resolve({list: []});
    }

    switch (type) {
      case 'email':
        keys = ['contact.email'];
        value = this.yggdrasil.lib.utils.format.email(value);
        break;
      case 'phone':
        keys = ['contact.phones.mobile', 'contact.phones.office'];
        value = this.yggdrasil.lib.utils.format.phone(value);
        break;
      case 'trigram':
        keys = ['identity.trigram'];
        value = value.toUpperCase();
        break;
      default:
        keys = castArray(type);
        break;
    }
    return super.findDupes(value, keys);
  }
}

module.exports = UsersRepository;
