'use strict';

/**
 * Normalize a port into a number, string, or false.
 * @param val
 * @returns {*}
 */
const normalizePort = (val) => {
  const _port = parseInt(val, 10);

  if (isNaN(_port)) {
    // named pipe
    return val;
  }

  if (_port >= 0) {
    // port number
    return _port;
  }
};

module.exports = {
  normalizePort: normalizePort
};