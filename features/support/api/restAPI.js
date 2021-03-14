'use strict';

const request = require('axios');

let api = {};

api.get = (url, bearer, json) => {
  let options = {
    method: 'get',
    url: url,
    resolveWithFullResponse: true,
    json: (json)
  };
  if (bearer) {
    options.headers = {
      'Authorization': 'Bearer ' + bearer
    };
  }
  return request(options);
};

api.post = (url, payload, bearer, json) => {
  let options = {
    method: 'post',
    url: url,
    body: payload,
    resolveWithFullResponse: true,
    json: (json)
  };
  if (bearer) {
    options.headers = {
      'Authorization': 'Bearer ' + bearer
    };
  }
  return request(options);
};

/**
 * Post with 'content-type': 'yggdrasillication/x-www-form-urlencoded' header
 * @param url
 * @param payload
 * @param bearer
 * @param json
 */
api.postForm = (url, payload, bearer, json) => {
  let options = {
    method: 'post',
    url: url,
    data: payload,
    json: (json)
  };
  if (bearer) {
    options.headers = {
      'Authorization': 'Bearer ' + bearer
    };
  }
  return request(options);
};

/**
 * Post with 'content-type': 'multipart/form-data' header
 * @param url
 * @param files
 * @param bearer
 * @param json
 */
api.postFiles= (url, files, bearer, json) => {
  let options = {
    method: 'post',
    url: url,
    formData: files,
    json: (json),
    headers: {'Content-Type': 'multipart/form-data'}
  };
  if (bearer) {
    options.headers.Authorization = 'Bearer ' + bearer
  }

  return request(options);
};

api.options= (url, headers, json) => {
  let options = {
    method: 'options',
    url: url,
    headers: headers || {},
    json: (json)
  };

  return request(options);
};

module.exports = api;