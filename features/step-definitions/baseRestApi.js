'use strict';

const
  { Given, Then, When } = require('cucumber'),
  { existsSync } = require('fs'),
  should = require('should');

Given(/^I (am|am not) authenticated$/, function(auth, callback) {
  if (auth === 'am not') {
    if (this.amIAuthenticated) {
      delete this.bearer;
      delete this.currentUser;
      this.amIAuthenticated = false;
      if (this.io) {
        this.io.close();
      }
      callback();
    } else {
      callback();
    }
  } else if (this.amIAuthenticated) {
    callback();
  } else {
    callback(false);
  }
});

Given(/^I authenticate myself as "([^"]*)" with password "([^"]*)" which (exist|does not exist)$/, function (username, password, exist, callback) {
  this.userExist = exist === 'exist';

  this.api.rest.postForm('http://localhost:' + this.serverPort + '/api/auth/login', {username: username, password: password},null, true)
    .then(response => {
      this.response = response;
      if (this.userExist) {
        this.amIAuthenticated = true;
        this.currentUser = response.body.user;
        this.bearer = response.body.jwt;
      }
      callback();
    })
    .catch(response => {
      this.response = response;
      callback();
    });

  return 'pending';
});

When(/I send [an]{1,2} "([^"]*)" request to "([^"]*)" awaiting for "([^"]*)"$/, function (method, url, type, callback) {
  let json, bearer, methodFuncName = 'get';

  if (method.toLowerCase() === 'options') {
    methodFuncName = 'options';
  }

  switch (type.toLowerCase()) {
    case 'json':
      json = true;
      bearer = this.bearer || null;
      break;
    case 'confirmation that POST method is allowed':
      json = true;
      // options to pass to the OPTIONS method
      bearer = {
        'Access-Control-Request-Headers': 'content-type',
        'Access-Control-Request-Method': 'POST',
        'Origin': 'http://localhost:3000',
        'Referer': 'http://localhost:3000/auth/login',
        'Sec-Fetch-Mode': 'no-cors'
      };
      break;
    default:
      json = false;
  }

  this.api.rest[methodFuncName]('http://localhost:' + this.serverPort + url, bearer, json)
    .then(response => {
      this.response = response;
      callback();
    })
    .catch(response => {
      this.response = response;
      callback();
    });

  return 'pending';
});

Then('I get a response with status code {int}', function (int, callback) {
  should(this.response.statusCode).eqls(int);
  callback();
});

Then('I get the current server version', function(callback) {
  should(this.response.body.server.version).not.be.undefined();
  callback();
});

Then('I get the current server time', function (callback) {
  should(this.response.body.server.currentTime).not.be.undefined();
  callback();
});

When(/^There is a file named "([^"]*)" containing "([^"]*)"$/, function(name, content, callback) {
  this.createTextFile(name, content);
  this.fileContent = content;
  callback();
});

Then(/^The response content type is "([^"]*)"$/, function(contentType, callback) {
  should(this.response.caseless.dict['content-type']).eqls(contentType);
  callback();
});

Then(/I get "([^"]*)" as the response content$/, function(text, callback) {
  should(this.fileContent).eqls(text);
  callback();
});

Then(/^The file named "([^"]*)" does not exist$/, function(name, callback) {
  try {
    if(existsSync('/var/yggdrasil/fileSystem/' + name)) {
      callback(new Error('The file ' + name + 'should not exist !'));
    } else {
      callback();
    }
  } catch (e) {
    callback();
  }
});

Then('The {string} response is', function (type, docString, callback) {
  switch (type.toLowerCase()) {
    case 'json':
      should(JSON.parse(this.response.response.body)).eqls(this.parseJSON(docString, callback));
      break;
    default:
      should(this.response.response.body).eqls(docString);
  }
  callback();
});

Then('The response headers contain', function (docString, callback) {
  should(this.response.headers).containDeep(this.parseJSON(docString));
  callback();
});

Then(/^I (do not get|get) a bearer from the server$/, function(get, callback) {
  if (get === 'get') {
    should(this.response.body.jwt).not.eqls(undefined);
  } else {
    should(this.response.body).eqls(undefined);
  }
  callback();
});

Then('A cookie named {string} matching {string} has been set by the server', function (cookieName, reg, callback) {
  const regex = new RegExp(cookieName + '=' + reg + '; Domain=localhost; Path=/');
  should(this.response.caseless.dict['set-cookie']).match(regex);
  callback();
});

Then('I get a user object with id {string} into {string}', function(id, where, callback) {
  should(this.response.body[where]).be.an.Object();
  should(this.response.body[where].data).be.an.Object();
  should(this.response.body[where].id).eqls(id);
  callback();
});
