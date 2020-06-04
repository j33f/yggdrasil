'use strict';

let
  getDirectories, getFiles,
  fs = require('fs'),
  path = require('path');

getDirectories = (srcpath) => {
  return fs.readdirSync(srcpath)
    .filter(file => fs.lstatSync(path.join(srcpath, file)).isDirectory());
};
getFiles = (srcpath) => {
  return fs.readdirSync(srcpath)
    .filter(file => fs.lstatSync(path.join(srcpath, file)).isFile());
};

module.exports = (srcpath, prefix, isApiRoot) => {
  let ret = [];
  if (isApiRoot) {
    getDirectories(srcpath).forEach(dir => {
      ret.push(prefix + dir);
    });
  } else {
    getFiles(srcpath).forEach(file => {
      if (file === 'index.js') {
        file = '';
      } else {
        file += '/';
      }
      ret.push(prefix + file.replace('.js',''));
    });
  }
  return ret.sort();

};