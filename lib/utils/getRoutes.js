'use strict';

const {forOwn} = require("lodash");

const parseRegexp = (regExRoute) => {
  const components = regExRoute.source.match(/([\w\d\.\\-]+)/ig);

  // filter out standalone "\" characters
  const filtered = components.filter((component) => {
    return component !== '\\';
  });

  // filter out "\" from escaped chars (e.g. "v\.0")
  const cleanRouteComponents = filtered.map(component => {
    return component.replace(/\\/g, '');
  });
  return cleanRouteComponents.join('/');
};

let table = [];
const retrieveRoutes =  (topLevelRouteStack, parentPath) => {
  let allRoutes = [];
  let pPath = '';

  if (parentPath) {
    if (parentPath === '/') {
      parentPath = '';
    }
    pPath = parentPath;
  }

  // filter out middleware
  const routesArray = topLevelRouteStack.filter((stack) => {
    return stack.route || stack.handle.stack;
  });

  routesArray.forEach(e => {
    // if terminal route, parse regex and add to tree/table
    if (e.route) {
      if (e.route.path instanceof RegExp) {
        e.route.path = '/' + parseRegexp(e.route.path);
      }
      if (e.route.stack.length > 0) {
        let route = {
          url: pPath + e.route.path,
          method: e.route.stack[0].method
        };

        allRoutes.push(route); // add to route tree
        route.subRouter = pPath; // add subrouter path
        table.push(route); // add to route table
      }
      // if subrouter exists, parse path and attach subtree to tree
    } else if (e.handle.stack) {

      let parentName; // subRouter name/label
      let parentPath; // subRouter path

      if (e.regexp.test('/')) {
        parentName = '/';
        parentPath = pPath;
      } else {
        parentName = parseRegexp(e.regexp);
        parentPath = pPath + '/' + parentName;
      }

      var subRouter = {url: parentName};

      // recurse until reach all terminal routes

      subRouter.children = retrieveRoutes(e.handle.stack, parentPath);

      allRoutes.push(subRouter);

    }
  });
  return allRoutes;
};


const getRoutes = (app) => {
  //const routes = {};

/*
  forOwn(app._router.stack, (middleware) => {
    if (!middleware.route) {
      return;
    }
    const { method } = middleware.route.stack[0];
    const { path } = middleware.route;
    console.log(middleware.route.stack);
    routes[method] = routes[method] || [];
    routes[method].push(path);
  });
*/
  //return routes;
  const routes =  retrieveRoutes(app._router.stack);
  return {
    routes: routes,
    table: table
  };
};
module.exports = getRoutes;
