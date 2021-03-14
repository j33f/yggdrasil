'use strict';

const
  { Then } = require('@cucumber/cucumber'),
  { get, cloneDeep } = require('lodash'),
  should = require('should');

/**
 * Add some vocabulary to should so that we can compare arrays of unordered data and making
 * [1, 2, 3] quivalent to [3, 1, 2]
 */
should.Assertion.add('haveSameItems', function (other) {
  this.params = { operator: 'to be have same items' };

  const a = this.obj.slice(0);
  const b = other.slice(0);

  function deepSort(objA, objB) {
    const c = JSON.stringify(objA);
    const d = JSON.stringify(objB);

    return (c < d ? -1 : (c > d ? 1 : 0));
  }

  a.sort(deepSort);
  b.sort(deepSort);

  a.should.be.deepEqual(b);
});

/**
 * Await for an event to be fired by the server and check its payload (message or data)
 * Also await for the last action to be performed (create, update or delete)
 *
 * @param type - the event type (create, update or delete)
 * @param event - the event root to listen too
 * @param that -  this !
 * @param callback -  the cucumber callback
 */
function awaitForEventResponse (type, event, that, callback) {
  let response;

  if (!that.listenersResponses[event]) {
    // There is no response available yet for the targeted listener
    setTimeout(function() {
      awaitForEventResponse (type, event, that, callback);
    }, 10);
  } else {
    // oh yeah the listener got a message !
    response = that.listenersResponses[event];

    switch (type) {
      case 'create':
        if (!that.lastCreatedDocument) {
          // the previous action have not yet received a response from the server
          setTimeout(function() {
            awaitForEventResponse (type, event, that, callback);
          }, 10);
        } else {
          should(response._id).eqls(that.lastCreatedDocument._id);
          should(response.body).containEql(that.lastCreatedDocument.body);
          callback();
        }
        break;
      case 'update':
        if (!that.lastCreatedDocument) {
          // the previous action have not yet received a response from the server
          setTimeout(function() {
            awaitForEventResponse (type, event, that, callback);
          }, 10);
        } else {
          delete that.lastUpdatedDocument.lastModifiedAt;

          should(response._id).eqls(that.lastUpdatedDocument._id);
          should(response.body).containEql(that.lastUpdatedDocument);
          callback();
        }
        break;
      case 'delete':
        if (!that.response) {
          // the previous action have not yet received a response from the server
          setTimeout(function() {
            awaitForEventResponse (type, event, that, callback);
          }, 10);
        } else {
          should(that.response.status).eqls('ok');
          callback();
        }
        break;
      default:
        callback(new Error('Wrong event type (available types are create, update and delete'));
    }
  }
}

/**
 * Emitters
 */

Then('I emit the {string} event with no data', function(event, callback) {
  this.emit(event, null, callback);
  return 'pending';
});

Then('I emit the {string} event to get the document with id {string}', function(event, id, callback) {
  this.emit(event, {id: id}, callback);
  return 'pending';
});

Then('I emit the {string} event with the following query data', function(event, query, callback) {
  this.emit(event, this.parseJSON(query), callback);
  return 'pending';
});

Then('I emit the {string} event to create the following document', function(event, doc, callback) {
  this.createdDocument = this.parseJSON(doc);
  this.emit(event, this.createdDocument, callback);
  return 'pending';
});

Then('I emit the {string} event to delete the last created document', function(event, callback) {
  this.response = undefined;
  this.emit(event, {id: this.lastCreatedDocument._id}, callback);
  return 'pending';
});

Then('I emit the {string} event to update the last created document with', function(event, newDocument, callback) {
  let updatedDocument = this.parseJSON(newDocument);

  updatedDocument._id = this.lastCreatedDocument._id;
  this.lastUpdatedDocument = updatedDocument;

  this.emit(event, updatedDocument, callback);
  return 'pending';
});

/**
 * Emitters response check
 */

Then('I receive a document corresponding to the fixture located in {string} with id {string}', function(fixturePath, fixtureId, callback) {
  this.compareResponseToFixture(fixturePath, fixtureId);

  callback();
});

Then('I receive a document list containing the fixtures located in {string}', function(fixturesPath, callback) {
  should(this.response.list).haveSameItems(get(this.fixtures, fixturesPath));
  callback();
});

Then('I receive a document list containing documents with the following ids', function(idsList, callback) {
  const ids = this.parseJSON(idsList);

  should(this.response.list.length).eqls(ids.length);
  this.response.list.forEach(item => {
    should(ids.includes(item._id)).be.true();
  });
  callback();
});

Then('I receive the created document with its id', function(callback) {
  let document = cloneDeep(this.createdDocument);
  delete document.createdAt;
  delete document.createdBy;

  should.exist(this.response._id);
  should.exist(this.response.body._id);
  should(this.response._id).eqls(this.response.body._id);
  this.lastCreatedDocument = this.response;

  document._id = this.response._id;
  should(this.response.body).containDeep(document);
  callback();
});

Then('The response have the following properties', function(propertiesList, callback) {
  this.parseJSON(propertiesList).forEach(propertyName => {
    should.exist(this.response[propertyName]);
  });
  callback();
});

Then('I receive a JWT error as a response', function (callback) {
  should.exist(this.errorResponse);
  should.not.exist(this.response);
  should(this.errorResponse).eqls({
    message: 'no token provided',
    code: 'credentials_required',
    type: 'UnauthorizedError'
  });
  callback();
});

Then('I receive {int} document(s) in list', function(count, callback) {
  should.exist(this.response.list);
  should(this.response.list).have.length(count);
  callback();
});

Then('The list contains a document at position {int} having {string} equals {string} {string}', function(pos, key, type, value, callback) {
  should.exist(this.response.list);
  should.exist(this.response.list[pos]);
  switch (type) {
    case 'string':
      should(get(this.response.list[pos], key)).eqls(value);
      break;
    case 'integer':
      should(get(this.response.list[pos], key)).eqls(parseInt(value));
      break;
    case 'float':
      should(get(this.response.list[pos], key)).eqls(parseFloat(value));
      break;
  }
  callback();
});

Then('The list contains a document at position {int} having {string} which exist', function(pos, key, callback) {
  should.exist(this.response.list);
  should.exist(this.response.list[pos]);
  should.exist(get(this.response.list[pos], key));
  callback();
});

/**
 * List count comparator
 */

Then('There is/are {int} more document(s) than in fixture(s) {string}', function(howMany, fixturePath, callback) {
  should(this.response.list.length).eqls(get(this.fixtures, fixturePath).length + howMany);
  callback();
});

/**
 * Listeners
 */

Then('I listen to the {} event {string}{}', function (type, event, unused, callback) {
  let realEvent;
  switch(type) {
    case 'create':
      realEvent = String(event);
      break;
    case 'update':
    case 'delete':
      realEvent = String(event) + '/' + this.lastCreatedDocument.body._id;
      break;
    default:
      callback(new Error('Wrong event type (available types are create, update and delete'));
      return;
  }

  this.listen(realEvent, data => {
    this.listenersResponses[event] = data;
  });
  callback();
});

Then('The listener to the {} event {string} receives the right response', function(type, event, callback) {
  awaitForEventResponse (type, event, this, callback);
  return 'pending';
});