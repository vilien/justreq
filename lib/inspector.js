'use strict';

const path = require('path');
const xecho = require('./xecho');

const cwd = process.cwd();

/**
 * inspector cacheType
 * Load a custom inspector script and execute it.
 * Expect the return of script as {needCache: <boolean>, cacheId: <md5>} to decide whether need cache or not
 * @param  {object} cacheType The cacheType create by cacheMap.js
 * @param  {json}   options   The config contain inspector's file (eg. {inspector: 'ins.js'})
 * @param  {json}   req       The req create by http request
 * @param  {buffer} chunk     The chunk from FormData
 */
const inspector = (cacheType, options, req, chunk = '') => {
  let inspFile = path.resolve(cwd, options.inspector);
  let inspModule = require(inspFile);
  let patt = /^[0-9a-f]{32}$/i;
  let typeScope = [0, 6]; // type in these can be inspected
  let result = inspModule({
    headers: req.headers,
    method: req.method,
    url: req.url,
    httpVersion: req.httpVersion
  }, chunk);

  if (typeScope.indexOf(cacheType.type) < 0) return false;

  /**
   * Expect result = {needCache: <boolean>, cacheId: <md5>}
   */
  if (result && result.needCache) {
    if (patt.test(result.cacheId)) {
      cacheType.type = 0;
      cacheType.key = result.cacheId;
      cacheType.time = +new Date();
      return true;
    } else {
      xecho('Got a wrong cacheId: "' + result.cacheId + '" from inspector.\nexpect an md5 code, just like "e0e39d220ff38421b6dd61a998975b28"', 'warn');
    }
  } else if (result && result.needCache === false) {
    cacheType.type = 3;
    return true;
  }
  return false;
};

module.exports = inspector;