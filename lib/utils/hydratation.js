/* eslint-disable no-eval */
'use strict';

const { castArray, assignIn }= require('lodash');

let flatten, unflatten, hydrate;
/**
 * Create a flattened object from a plain one
 *
 * Plain object is multidimentional object like
 * { foo: { bar: { baz: 'qux' } } }
 *
 * Flatten object is one dimention object like
 * { "foo.bar.baz": "qux" }
 * @param {object} data - the flatten object
 *
 * @return {object} - the flattened object
 */
flatten = data => {
  let result = {};

  const recurse = (cur, prop) => {
    let i, l, isEmpty;

    if (Object(cur) !== cur) {
      result[prop] = cur;
    } else if (Array.isArray(cur)) {
      for(i=0, l=cur.length; i<l; i++) {
        recurse(cur[i], prop ? prop + '.' + i : String(i));
      }
      if (l === 0) {
        result[prop] = [];
      }
    } else {
      isEmpty = true;
      Object.keys(cur).forEach(p => {
        isEmpty = false;
        recurse(cur[p], prop ? prop + '.' + p : p);
      });
      if (isEmpty) {
        result[prop] = {};
      }
    }
  };

  recurse(data, '');
  return result;
};

/**
 * Create a plain object from a flatten one
 *
 * Plain object is multidimentional object like
 * { foo: { bar: { baz: 'qux' } } }
 *
 * Flatten object is one dimention object like
 * { "foo.bar.baz": "qux" }
 * @param {object} data - the flatten object
 *
 * @return {object} - the unflattened object
 */
unflatten = data => {
  let result = {}, cur, prop, parts, idx;

  if (Object(data) !== data || Array.isArray(data)) {
    return data;
  }
  Object.keys(data).forEach(p => {
    cur = result;
    prop = '';
    parts = p.split('.');
    for(let i=0; i<parts.length; i++) {
      idx = !isNaN(parseInt(parts[i]));
      cur = cur[prop] || (cur[prop] = (idx ? [] : {}));
      prop = parts[i];
    }
    cur[prop] = data[p];
  });
  return result[''];
};

/**
 * Create a business object from a plain object based on an hydratation map object
 *
 * The plain object contains only references ids of the linked objects, the hydratation process aims to create a fully
 * usable business object
 *
 * @param {object} map - the hydratation map
 * @param {object} toBeHydrated - the plain object to be hydrated
 *
 * @return {object} - the hydrated object
 */
hydrate = (map, toBeHydrated) => {
  let target = {};
  Object.keys(map).forEach(key => {
    const temp = unflatten(map[key]);

    let value;
    try {
      value = eval('toBeHydrated.' + key); // retrieve the data from the key, I know, eval is evil
    } catch(e) {
      // TODO HANDLE ERROR
    }

    if (value) {
      try {
        switch (temp.type) {
          case 'unique':
            // TODO activate when objects are ready
            // TODO use business objects instead !
            //target[key] = yggdrasil.repositories[temp.object].get(value);
            break;
          case 'array':
            target[key] = [];
            // if there is only one entry in the array, it may be returned as a single string...
            castArray(value).forEach(() => {
              // TODO activate when objects are ready
              // TODO use business objects instead !
              // target[key].push(yggdrasil.repositories[temp.object].get(value[k]));
            });
            break;
        }
      } catch(e) {
        // TODO handle error
      }
    }

    // the array looks like the hydratation map, we have to unflatten it before to merge it
    assignIn(toBeHydrated, unflatten(target));
    return toBeHydrated;
  });
};

module.exports = {
  flatten: flatten,
  unflatten: unflatten,
  hydrate: hydrate
};
