const Repository = require('../../../lib/models/repositories/Repository');

class ExampleRepository extends Repository {
  constructor (yggdrasil) {
    super('Example', 'example', 'data', yggdrasil);
  }
}

module.exports = ExampleRepository;