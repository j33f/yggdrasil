# Data and business object models

There are [data models](./dataModels): each data models can be represented as:
* a simple json file, representing the data myggdrasiling for this type of data
* a directory named after the data type containing:
    * a json file named ```myggdrasiling.json``` containing the myggdrasiling
    * another json file named ```hydratation.json``` containing the hydratation map in order to hydrate the data before to send them to the clients
    
## Hydratation

Some data parts are just references to the id of other data. In order to use those data from the client, they need to be hydrated: the ids are replaced by the real objects.
Hydratation can also become a way to accerelate the developpment since the hydrated objects includes real objects, not only their JSON representations.

For example, if there is a user object with a ```callPhone``` member, and this user object is hydrated into a mandate object, we can just call ```mandate.users[theUserID].callPhone``` we don't need to create a new user object then call its members.

Of course, those objects are sent as JSON data to the clients.
Of course too, those objects are stored the same way: dryed.

### Hydratation maps

In order to know what to hydrate and how, there are hydratation maps.

For roots members, the definition is simple :
```
"memberName": {
    "type": "unique|array",
    "object": "businessObjectName"
  }
```
When hydrating, the member name is used as an id to instantiate a new business object with it.
The ```type``` property is used to know if we have to iterate over the values or not.

For nested objects, the whole path should be used as the member name. If we want to hydrate the following object:
```
foo: {
    bar: {
        toBeHydrated: 'uuid'
    }
}        
```
the following hydratation map will be used: 
```
"foo.bar.toBeHydrated": {
    "type": "unique",
    "object": "someBusinessObjectClassName"
}
```

## Repositories

These are classes that define the behavior of each business object what can be stored into the storage component.
They all extends the ```Repository``` class which defines commons ways to CRUDLS (Create, Read, Update, Delete, List and Search) the data.
Of course, any or all methods defined by the ```Repository``` class can be extended (see [CredentialsRepository.js](./repositories/CredentialsRepository.js))

## Security

There are some special internal business objects or common objects relative to the security behavior and management such as session or policies.


