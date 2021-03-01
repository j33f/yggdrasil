'use strict';

let list = [];

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

const handleTerminalRoute = (element, parentPath, tree) => {
  if (element.route && element.route.stack.length > 0) {
    if (element.route.path instanceof RegExp) {
      element.route.path = '/' + parseRegexp(element.route.path);
    }

    let route = {
      url: parentPath + element.route.path,
      method: element.route.stack[0].method
    };

    tree.push(route); // add to route tree
    route.subRouter = parentPath; // add subrouter path
    list.push(route); // add to route list
  }
};

const handleSubRouter = (element, parentPath, tree) => {
  if (!element.handle.stack) {
    return;
  }
  let parentName; // subRouter name/label

  if (element.regexp.test('/')) {
    parentName = '/';
  } else {
    parentName = parseRegexp(element.regexp);
    parentPath = parentPath + '/' + parentName;
  }

  let subRouter = {url: parentName};
  // recurse until reach all terminal routes
  subRouter.children = retrieveRoutes(element.handle.stack, parentPath);
  tree.push(subRouter);
};

const retrieveRoutes =  (topLevelRouteStack, parentPath) => {
  let tree = [];

  parentPath = parentPath || '';

  if (!parentPath && parentPath === '/') {
    parentPath = '';
  }

  // filter out middleware
  const routes = topLevelRouteStack.filter((stack) => {
    return stack.route || stack.handle.stack;
  });

  routes.forEach(element => {
    handleTerminalRoute(element, parentPath, tree);
    handleSubRouter(element, parentPath, tree);
  });
  return tree;
};


const getRoutes = (app) => {
  return {
    list: list,
    tree: retrieveRoutes(app._router.stack)
  };
};
module.exports = getRoutes;
