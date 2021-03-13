'use strict';

const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
require('should-sinon');

const git = rewire('./git');

let logs = 'ed701dd1c31e6661b154ef18cdedcfe3f9b958f2 4d66484539ccc8f4cab5c45e68a7fd993a3d6d0a jeff <jeff@modulaweb.fr> 1615079796 +0100\tcommit: wip - refactor mongo & redis drivers + mongo tests\n' +
  '4d66484539ccc8f4cab5c45e68a7fd993a3d6d0a 8fa7b173cbded3fc5ebb7c1bf507bd98df2f7ca2 jeff <jeff@modulaweb.fr> 1615228648 +0100\tcommit: improvement(redis/mongo): better drivers + full tests\n' +
  '8fa7b173cbded3fc5ebb7c1bf507bd98df2f7ca2 8a42001979c1b5a5ed83680b9ec2d9c2b672e4e4 jeff <jeff@modulaweb.fr> 1615256795 +0100\tcommit: refactor(storageservice/repositories): uniformize, refactor and add tests\n' +
  '8a42001979c1b5a5ed83680b9ec2d9c2b672e4e4 d8da521ca6c0d35bd92b796565b97932dac07395 jeff <jeff@modulaweb.fr> 1615256968 +0100\tcommit: fix(typos): adds lint:fix npm script and fix lint\n';

let fs = {
  readFileSync: sinon.stub().returns(logs)
};

const path = {
  join: sinon.stub().callsFake((...a) => a.join('/'))
};

git.__set__('fs', fs);
git.__set__('path', path);

xdescribe('Utils git', () => {
  beforeEach(() => {
    const nowUnix = 1615260568;
    sinon.useFakeTimers(nowUnix);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should respond with the proper object', () => {
    const expected = {
      id: 'd8da521ca6c0d35bd92b796565b97932dac07395',
      author: 'jeff',
      pushed: 'in 51 years (09/03/2021 03:29:28+0100)',
      type: 'commit',
      comment: 'fix(typos): adds lint:fix npm script and fix lint'
    };
    const result = git.getLastCommit();
    should(result).eqls(expected);
  });

  it('should respond with the proper object if there is no commits', () => {
    fs = {
      readFileSync: sinon.stub().throws()
    };
    git.__set__('fs', fs);

    const expected = { type: 'clone', comment: 'Fresh clone' };
    const result = git.getLastCommit();
    should(result).eqls(expected);
  });
});