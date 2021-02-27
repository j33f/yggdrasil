# Repositories

From the Yggdrasil point of view, a repository is a business object repository defining, at least, a way to store and retrieve data.

The [Repository super class](Repository/index.js) provide all the methods for CRUDLS :
- create
- read
- delete
- list
- search

It also provides some more things : 
- advanced model check and format
- controllers (see [controllers](../../controllers))
- HTTP routes to add to the router controller
- SocketIO listeners to add to the global ones
- internal events listeners to set

## Minimal repository
```javascript
const Repository = require('../Repository');

class MyRepository extends Repository {
  constructor(yggdrasil) {
    super('MyRepository', 'anIndex', 'aCollection', yggdrasil);
  }
}
module.exports = MyRepository;
```