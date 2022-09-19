# Controllers

Here are the main Yggdrasil controllers.

Those controllers are not linked to specific data or action.

They are 4 : 
- routerController
- socketIoController
- eventsController
- mailController

<a name="routerController"></a>
## Router Controller

It is the main HTTP route for the Yggdrasil API.

<a name="socketIoController"></a>
## SocketIO Controller

It manage the SocketIO server and event listeners and broadcaster.

<a name="eventsController"></a>
## Events controller

It manage the internal event emitter.
You can use the following methods : 

- ```yggdrasil.listen``` to add a listener for an event
- ```yggdrasil.stopListening``` to stop listening to one or many events
- ```yggdrasil.listenOnce``` to add a one time listener
- ```yggdrasil.fire``` to fire an event

<a name="mailController"></a>
## Mail controller

It allow Yggdrasil to send emails via SMTP or Mailjet.