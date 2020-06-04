# Router controller

This is where the HTTP routes logic resides.

The routes are organized as functional units for each root parts of the URLS.

For example:
* the / URL route logic resides in /routes/index.js
* the /api/ URL route logic resides in /routes/api/index.js
* the /api/users/me URL route logic resides in /routes/users/me.js
* the /api/auth/login URL route logic resides in /routes/api/auth.js

## Rules

When an URL route logic is quite big, it is better to put it in its own module. Routes like authentication ones (login/logout) are quite tiny, so that they are in the same module.

### No core logic in routes !

Since these routes are made only for HTTP purposes, there is no core logic in them, the core logic resides in the [controllers](../controllers).

## Versions

The routes sets have to live into their own directory, the goal for this is to allow two versions of the api to coexist if needed.