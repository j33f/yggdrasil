# The Controllers

They recieve formatted requests (from anywhere of the yggdrasil, HTTP routes, WS, internal calls...) and respond as promises.

There should be a controller attached to each HTTP route.

All those controllers can be accessed via the ```api.lib.controllers``` object.