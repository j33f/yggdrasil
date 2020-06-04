# Utils

These are some internal utilities for the yggdrasil

* apiExplorer: utility used by the routes to inform users about the routes structures and facilitate auto discovery in the future
* bearer: an Express middleware to test if the current active route requires an authentication token or not, then allow or refuse to respond according to the rules and presence of a token (:warning: but do not validate it!!!)
* hydratation: perform the hard job during the hydratation process
* mongo: an abstraction layer for mongo simplifying its API and rationalize the outputs
* redis: an abstraction layer for Redis simplifying its API and rationalize the outputs
* rights: a rights utility to test and merge rights
