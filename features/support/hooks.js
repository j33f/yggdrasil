'use strict';

const
  { After } = require('@cucumber/cucumber'),
  { unlinkSync } = require('fs'),
  { remove } = require('lodash');

After({tags: '@cleanFsAfter'}, function() {
  this.filesCreated.forEach(filePath => {
    try {
      unlinkSync(filePath);
      remove(this.filesCreated, n => n === filePath);
    } catch(e) {
      console.error('An error occured when deleting', filePath, 'during cleanfsafter hook', e);
    }
  });
  if (this.filesCreated.length) {
    throw new Error('File cleanup failed');
  }
});

After({tags: '@ioDisconnectAfter'}, function() {
  if (this.io) {
    this.io.close();
  }
});
