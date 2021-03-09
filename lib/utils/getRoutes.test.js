'use strict';

const should = require('should');

const getRoutes = require('./getRoutes');

const express = require('express');
const router = express.Router();

const generateRouter = () => {
  const r = express.Router();
  r.get('/foo', () => {});
  r.post('/bar/:bar', () => {});
  r.put('/baz/:baz([0-9]{6})', () => {});
  r.delete('^/[barz]{3}$', () => {});
  r.options(/^\/foo\/ba[rz]\/[qQ]ux\/?$/, () => {});
  return r;
};

router.use('/foo', generateRouter());
router.use('/bar', generateRouter());
router.use('/baz', generateRouter());
router.use('/qux', generateRouter());

const app = express();
app.use('/', router);

const expected = {
  list: [
    { url: '/foo/foo', method: 'get', subRouter: '/foo' },
    { url: '/foo/bar/:bar', method: 'post', subRouter: '/foo' },
    {
      url: '/foo/baz/:baz([0-9]{6})',
      method: 'put',
      subRouter: '/foo'
    },
    { url: '/foo^/[barz]{3}$', method: 'delete', subRouter: '/foo' },
    {
      url: '/foo/foo/ba/rz/qQ/ux',
      method: 'options',
      subRouter: '/foo'
    },
    { url: '/bar/foo', method: 'get', subRouter: '/bar' },
    { url: '/bar/bar/:bar', method: 'post', subRouter: '/bar' },
    {
      url: '/bar/baz/:baz([0-9]{6})',
      method: 'put',
      subRouter: '/bar'
    },
    { url: '/bar^/[barz]{3}$', method: 'delete', subRouter: '/bar' },
    {
      url: '/bar/foo/ba/rz/qQ/ux',
      method: 'options',
      subRouter: '/bar'
    },
    { url: '/baz/foo', method: 'get', subRouter: '/baz' },
    { url: '/baz/bar/:bar', method: 'post', subRouter: '/baz' },
    {
      url: '/baz/baz/:baz([0-9]{6})',
      method: 'put',
      subRouter: '/baz'
    },
    { url: '/baz^/[barz]{3}$', method: 'delete', subRouter: '/baz' },
    {
      url: '/baz/foo/ba/rz/qQ/ux',
      method: 'options',
      subRouter: '/baz'
    },
    { url: '/qux/foo', method: 'get', subRouter: '/qux' },
    { url: '/qux/bar/:bar', method: 'post', subRouter: '/qux' },
    {
      url: '/qux/baz/:baz([0-9]{6})',
      method: 'put',
      subRouter: '/qux'
    },
    { url: '/qux^/[barz]{3}$', method: 'delete', subRouter: '/qux' },
    {
      url: '/qux/foo/ba/rz/qQ/ux',
      method: 'options',
      subRouter: '/qux'
    }
  ],
  tree: [
    {
      url: '/',
      children: [
        {
          url: 'foo',
          children: [
            { url: '/foo/foo', method: 'get', subRouter: '/foo' },
            { url: '/foo/bar/:bar', method: 'post', subRouter: '/foo' },
            {
              url: '/foo/baz/:baz([0-9]{6})',
              method: 'put',
              subRouter: '/foo'
            },
            {
              url: '/foo^/[barz]{3}$',
              method: 'delete',
              subRouter: '/foo'
            },
            {
              url: '/foo/foo/ba/rz/qQ/ux',
              method: 'options',
              subRouter: '/foo'
            }
          ]
        },
        {
          url: 'bar',
          children: [
            { url: '/bar/foo', method: 'get', subRouter: '/bar' },
            { url: '/bar/bar/:bar', method: 'post', subRouter: '/bar' },
            {
              url: '/bar/baz/:baz([0-9]{6})',
              method: 'put',
              subRouter: '/bar'
            },
            {
              url: '/bar^/[barz]{3}$',
              method: 'delete',
              subRouter: '/bar'
            },
            {
              url: '/bar/foo/ba/rz/qQ/ux',
              method: 'options',
              subRouter: '/bar'
            }
          ]
        },
        {
          url: 'baz',
          children: [
            { url: '/baz/foo', method: 'get', subRouter: '/baz' },
            { url: '/baz/bar/:bar', method: 'post', subRouter: '/baz' },
            {
              url: '/baz/baz/:baz([0-9]{6})',
              method: 'put',
              subRouter: '/baz'
            },
            {
              url: '/baz^/[barz]{3}$',
              method: 'delete',
              subRouter: '/baz'
            },
            {
              url: '/baz/foo/ba/rz/qQ/ux',
              method: 'options',
              subRouter: '/baz'
            }
          ]
        },
        {
          url: 'qux',
          children: [
            { url: '/qux/foo', method: 'get', subRouter: '/qux' },
            { url: '/qux/bar/:bar', method: 'post', subRouter: '/qux' },
            {
              url: '/qux/baz/:baz([0-9]{6})',
              method: 'put',
              subRouter: '/qux'
            },
            {
              url: '/qux^/[barz]{3}$',
              method: 'delete',
              subRouter: '/qux'
            },
            {
              url: '/qux/foo/ba/rz/qQ/ux',
              method: 'options',
              subRouter: '/qux'
            }
          ]
        }
      ]
    }
  ]
};

describe('Utils getRoutes', () => {
  it('should generate the right result', () => {
    const result = getRoutes(app);
    should(result).eqls(expected);
  });
});
