'use strict';

const fs = require('fs');
const path = require('path');
const moment = require('moment');

module.exports = {
  getLastCommit: () => {
    try {
      const gitLogs = fs.readFileSync(path.join(process.cwd(), '.git', 'logs', 'HEAD'), {encoding: 'utf8'}).split('\n');

      const lastLine = gitLogs[gitLogs.length - 2].split(' ');

      const utcType = lastLine[5].split('\t');

      const lastCommit = gitLogs[gitLogs.length - 2].split('\t');

      const date = moment.unix(lastLine[4]).utcOffset(utcType[0].replace(/([+-][01][0-9])([0-9]{2})/, '$1:$2'));

      return {
        id: lastLine[1],
        author: lastLine[2],
        pushed: date.fromNow() + ' (' + date.format('DD/MM/YYYY HH:mm:ss') + utcType[0] + ')',
        type: utcType[1].replace(':', ''),
        comment: lastCommit[lastCommit.length - 1].replace(utcType[1] + ' ', '')
      };
    } catch (e) {
      return {
        type: 'clone',
        comment: 'Fresh clone'
      };
    }
  }
};