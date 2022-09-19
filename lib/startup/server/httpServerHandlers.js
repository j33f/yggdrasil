'use strict';

module.exports = (yggdrasil) => {
  return {
    onError: (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof yggdrasil.server.port === 'string'
        ? 'Pipe ' + yggdrasil.server.port
        : 'Port ' + yggdrasil.server.port;

      // handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          yggdrasil.fire('log', 'error', '❗ ' + bind + ' requires elevated privileges');
          process.exit(1);
          break;
        case 'EADDRINUSE':
          yggdrasil.fire('log', 'error', '❗ ' + bind + ' is already in use');
          process.exit(1);
          break;
        default:
          throw error;
      }
    },
    onListening: () => {
      const
        addr = yggdrasil.server.serverObject.address(),
        bind = typeof addr === 'string'
          ? 'pipe ' + addr
          : 'port ' + addr.port;
      yggdrasil.fire('log', 'info', `🔧  HTTP server is listening at ${yggdrasil.server.domain} ${bind}`);
      yggdrasil.fire('startup/server/HTTP');
      console.timeEnd('time: ⏱   HTTP Server spawning took ');
    }
  };
};