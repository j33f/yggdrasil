module.exports = (yggdrasil) => {
  yggdrasil.sessionsService = new yggdrasil.lib.services.sessions(yggdrasil);
};