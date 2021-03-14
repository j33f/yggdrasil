const
  { setWorldConstructor } = require('@cucumber/cucumber'),
  { writeFileSync } = require('fs'),
  JSON5 = require('json5'),
  { get } = require('lodash'),
  should = require('should'),
  restAPI = require('./api/restAPI'),
  wsAPI = require('./api/wsAPI'),
  fixtures = require('./fixtures');

class World {
  constructor () {
    this.fixtures = fixtures;
    this.amILoggedIn = false;
    this.bearer = undefined;
    this.filesCreated = [];
    this.lastCreatedDocument = undefined;
    this.listenersResponses = {};

    this.io = null;

    this.serverProtocol = 'http';
    this.serverHost = 'localhost';
    this.serverPort = 8843;

    this.api = {
      rest: restAPI,
      ws: wsAPI
    };
  }

  /**
   * Creates a text file into the filestorage
   * @param name
   * @param content
   */
  createTextFile(name, content) {
    const filepath = '/var/fileStorage/' + name;
    writeFileSync(filepath, content);
    this.filesCreated.push(filepath);
  }

  /**
   * Parse some funky JSON
   * @param str
   */
  parseJSON(str) {
    return JSON5.parse(str);
  }

  /**
   * Connect to the server via socketIO
   * @returns {null}
   */
  connectIO() {
    if (!this.io) {
      this.io = this.api.ws.getSocket(`${this.serverProtocol}://${this.serverHost}:${this.serverPort}`, this.bearer || null);
    }

    return this.io;
  }

  /**
   * Emit an event directly to socketIO
   * @param event
   * @param message
   * @param listener
   */
  emitSIO(event, message, listener, errorListener) {
    this
      .connectIO()
      .emit(event, message, listener)
      .on('error', errorListener || function(data) {
        console.error(data);
        throw new Error('IO error');
      });
  }

  /**
   * Emit an event to sIO then get the response and make it available to the World
   *
   * @param event
   * @param message
   * @param callback
   */
  emit(event, message, callback) {
    let that = this;
    this.emitSIO(
      event,
      message,
      function(data) {
        that.response = data;
        that.errorResponse = undefined;
        callback();
      },
      function(data) {
        that.response = undefined;
        that.errorResponse = data;
        callback();
      }
    );
  }

  /**
   * Add a listener to an event
   *
   * @param event
   * @param listener
   */
  listen(event, listener) {
    this
      .connectIO()
      .on(event, listener);
  }

  /**
   * get a fixture from its path and its id
   *
   * @param path
   * @param id
   * @returns {undefined}
   */
  getFixture(path, id) {
    let fixture;
    get(this.fixtures, path).forEach((item) => {
      if (String(item._id) === String(id)) {
        fixture = item;
      }
    });
    return fixture;
  }

  /**
   * Compares this.response to a known fixture
   *
   * @param fixturePath
   * @param fixtureId
   * @param compareTo
   */
  compareResponseToFixture(fixturePath, fixtureId, compareTo) {
    const fixture = this.getFixture(fixturePath, fixtureId);
    compareTo = compareTo || this.response;

    should.exist(fixture);
    should.exist(compareTo);

    if (compareTo.id) {
      should(compareTo.id).eqls(fixtureId);
    } else if (compareTo._id) {
      should(compareTo._id).eqls(fixtureId);
    }

    if (compareTo.data) {
      should(compareTo.data).containEql(fixture);
    } else {
      should(compareTo.body).containEql(fixture);
    }
  }
}

setWorldConstructor(World);

module.exports = World;