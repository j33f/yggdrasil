'use strict';

module.exports = (sandbox, yggdrasil) => {
  const res = {};
  res.json = sandbox
    .stub().returnsThis();
  res.status = sandbox
    .stub()
    .returnsThis();
  res.setHeader = sandbox
    .stub()
    .returnsThis();
  res.send = sandbox
    .stub()
    .returnsThis();
  res.sendFile = sandbox
    .stub()
    .returnsThis();
  res.yggdrasil = yggdrasil;

  return {res};
};
