# OAuth Strategies

The currently supported OAuth strategies are:
- Google (via [passport-google-oauth2](https://www.npmjs.com/package/passport-google-oauth2))
- Facebook (via [passport-facebook](https://www.npmjs.com/package/passport-facebook))
- GitHub (via [passport-github](https://www.npmjs.com/package/passport-github))
- Microsoft (all MS entries, from XBox, Office365, Windows, Skype...) via a custom [passport](https://www.npmjs.com/package/passport) strategy
    - uses [MSAL](https://www.npmjs.com/package/@azure/msal-node)
- Twitter via a custom strategy
    - uses [twittersignin](https://www.npmjs.com/package/twittersignin)
    
Microsoft and Twitter strategies are custom ones because no currently available passport strategies were able to perform
a working auth or profile retrieving process.

## Add your own strategy

1. Create your strategy
2. Call `yggdrasil.repositories.auth.addOAuthStrategy('strategyName', new strategyClass());`

### Create your strategy

Passport is made to be used directly with Express, and the `authorize` method have to be called on each and every route.
As Yggdrasil uses its own auth system (based on JWT, based on [express-jwt](https://www.npmjs.com/package/express-jwt) 
and [socketio-jwt](https://www.npmjs.com/package/socketio-jwt)), we need to use a custom way to call 
the passport strategies.

To do so, there is an abstraction layer, performed by the [OAuthStrategy](./OAuthStrategy.js) class, that allow you to
use officials passport strategies or custom ones without a headache.

To create your own OAuth strategy, have a look at the [Google strategy](./GoogleStrategy.js).

The process is quite simple : 

1. import the [OAuthStrategy](./OAuthStrategy.js) class
2. import the passport strategy you want to use
3. create a class which extends the OAuthStrategy class
4. put your strategy configuration into your custom config file (ig .yggdrasilrc)

Once this is done, you can call `yggdrasil.repositories.auth.addOAuthStrategy('strategyName', new strategyClass());`