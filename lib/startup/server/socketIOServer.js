module.exports = async (yggdrasil) => {
  yggdrasil.fire('log', 'info', '🩴  Instantiating SocketIo (attached to HTTP server)...');

  yggdrasil.socketIoController = new yggdrasil.lib.controllers.socketIo(yggdrasil);
};