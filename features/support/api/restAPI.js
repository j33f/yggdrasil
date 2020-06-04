'use strict';

const rp = require('request-promise');

let api = {};

api.get = (uri, bearer, json) => {
  let options = {
    uri: uri,
    resolveWithFullResponse: true,
    json: (json)
  };
  if (bearer) {
    options.headers = {
      'Authorization': 'Bearer ' + bearer
    };
  }
  return rp(options);
};

api.post = (uri, payload, bearer, json) => {
  let options = {
    method: 'POST',
    uri: uri,
    body: payload,
    resolveWithFullResponse: true,
    json: (json)
  };
  if (bearer) {
    options.headers = {
      'Authorization': 'Bearer ' + bearer
    };
  }
  return rp(options);
};

/**
 * Post with 'content-type': 'yggdrasillication/x-www-form-urlencoded' header
 * @param uri
 * @param payload
 * @param bearer
 * @param json
 */
api.postForm = (uri, payload, bearer, json) => {
  let options = {
    method: 'POST',
    uri: uri,
    form: payload,
    resolveWithFullResponse: true,
    json: (json)
  };
  if (bearer) {
    options.headers = {
      'Authorization': 'Bearer ' + bearer
    };
  }
  return rp(options);
};

/**
 * Post with 'content-type': 'multipart/form-data' header
 * @param uri
 * @param files
 * @param bearer
 * @param json
 */
api.postFiles= (uri, files, bearer, json) => {
  let options = {
    method: 'POST',
    uri: uri,
    formData: files,
    resolveWithFullResponse: true,
    json: (json)
  };
  if (bearer) {
    options.headers = {
      'Authorization': 'Bearer ' + bearer
    };
  }
  return rp(options);
};

api.options= (uri, headers, json) => {
  let options = {
    method: 'OPTIONS',
    uri: uri,
    resolveWithFullResponse: true,
    headers: headers || {},
    json: (json)
  };

  return rp(options);
};

module.exports = api;