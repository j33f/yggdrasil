module.exports = async (yggdrasil) => {
  yggdrasil.logger.info('☘  Instantiating SocketIo (attached to HTTP server)...');

  yggdrasil.socketIoController = new yggdrasil.lib.controllers.socketIo(yggdrasil);
};