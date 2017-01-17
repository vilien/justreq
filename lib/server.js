'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const xecho = require('./xecho');
const ReduceFormData = require('./reduceFormData');
const proxy = require('./proxy');
const utils = require('./utils');
const CacheMap = require('./cacheMap');
const html = require('./html');
const Jrs = require('./jrs');
const cacheToResponse = require('./cacheToResponse');
const pkg = require('../package.json');

const SPLIT_LINE = '=================================================================';

const Server = function(options) {
  this.opt = options;
  this.opt.version = pkg.version;
  this.opt.onCors = this.opt.onCors === 'yes';
  this.svr = http.createServer((req, res)=>this.newSocket(req, res));
  this.svr.listen({port: this.opt.jrPort});
  this.cacheTime = utils.parseExpires(this.opt.cacheTime);
  this.cacheMap = new CacheMap(this.opt);
  html.init(this.opt);
  xecho('Welcome! JR server is running on port ' + this.opt.jrPort);
  xecho(SPLIT_LINE);
};

Server.prototype.newSocket = function(req, res) {
  let length = parseInt(req.headers['content-length'] || 0), piped = false,
    attachedHead = {'Server': 'JR Server/' + this.opt.version};

  if (this.opt.onCors && req.headers['origin']) {
    attachedHead['Access-Control-Allow-Origin'] = req.headers['origin'];
    attachedHead['Access-Control-Allow-Credentials'] = true;
  }
  res.sendHead = (statusCode, headers) => res.writeHead(statusCode, Object.assign(attachedHead, headers));
  if (this.responded(req, res)) return;
  if (!length) {
    piped = true;
    this.startPipe(req, res, attachedHead);
  }
  req.on('data', (chunk)=>{
    if (!piped) {
      piped = true;
      this.startPipe(req, res, attachedHead, chunk);
    }
  });
};

Server.prototype.responded = function(req, res) {
  if (req.method === 'OPTIONS') {
    if (req.headers['origin'] && this.opt.onCors) {
      res.sendHead(200, {
        'Access-Control-Allow-Methods': 'HEAD, GET, POST, PUT, DELETE',
        'Access-Control-Allow-Headers': req.headers['Access-Control-Request-Headers'] || '',
        'Access-Control-Max-Age': 86400
      });
      res.end();
      return true;
    }
  }
  return false;
};

Server.prototype.startPipe = function(req, res, attachedHead, chunk) {
  let rfd = new ReduceFormData(this.opt, req.headers), cacheType, needProxy = false;

  req.pause();
  if (chunk) rfd.feed(chunk);
  cacheType = this.checkCacheType(req, rfd);
  switch (cacheType.type) {
  case 0: // Need proxy, cache to fastmap
    xecho('PROXY: ' + req.method + ' ' + req.url, 'proxy', true);
    this.cacheMap.updateMap(cacheType.key);
    needProxy = true;
    break;
  case 1: // JRScript substitution
    xecho('JRS: ' + req.method + ' ' + req.url + '->' + cacheType.subs, 'jrs', true);
    this.execJrs(cacheType, req, res, chunk);
    break;
  case 2: // Normal substitution
    xecho('SUBS: ' + req.method + ' ' + req.url + '->' + cacheType.subs, 'subs', true);
    this.readSubs(cacheType, req, res);
    break;
  case 3: // Not allow cache
    xecho('PROXY[NOCACHE]: ' + req.method + ' ' + req.url, 'warn', true);
    needProxy = true;
    break;
  case 4: // in fastmap
    if (!this.readCache(cacheType, req, res)) { // No cache file
      xecho('PROXY: ' + req.method + ' ' + req.url, 'proxy', true);
      this.cacheMap.updateMap(cacheType.key);
      needProxy = true;
    } else {
      xecho('CACHE: ' + req.method + ' ' + req.url, 'cache', true);
    }
    break;
  case 5: // in slowmap
    if (!this.readCache(cacheType, req, res)) { // No cache file
      xecho('PROXY: ' + req.method + ' ' + req.url, 'proxy', true);
      this.cacheMap.updateMap(cacheType.key, true);
      needProxy = true;
    } else {
      xecho('CACHE: ' + req.method + ' ' + req.url, 'cache', true);
    }
    break;
  case 6: // Need proxy, cache to slowmap & fastmap
    xecho('PROXY: ' + req.method + ' ' + req.url, 'proxy', true);
    this.cacheMap.updateMap(cacheType.key);
    needProxy = true;
    break;
  }
  if (needProxy) {
    let cacheFileName = cacheType.type !== 3 ? cacheType.key : '';
    new proxy(this.opt, req, res, attachedHead, cacheFileName, chunk);
  }
};

Server.prototype.readCache = function(ct, req, res) {
  let time = +new Date();
  let file = path.resolve(this.opt.cachePath , ct.key);
  let result = false;
  if (time - ct.time < this.cacheTime) {
    if (utils.fsExistsSync(file, fs.R_OK)) {
      try {
        let transCache = new cacheToResponse(res);
        fs.createReadStream(file).pipe(transCache).pipe(res);
        result = true;
        req.resume();
      } catch (err) {}
    }
  }
  return result;
};

Server.prototype.execJrs = function(ct, req, res, chunk) {
  let file = path.resolve(this.opt.substitutePath, ct.subs);
  try {
    new Jrs(this.opt, file, req, res, chunk);
  } catch (err) {
    html.send500(res, err);
  }
};

Server.prototype.readSubs = function(ct, req, res) {
  let file = path.resolve(this.opt.substitutePath, ct.subs);
  req.resume();
  if (utils.fsExistsSync(file, fs.R_OK)) {
    try {
      let head = {
        'Content-Type': html.checkMime(file)
      };
      res.sendHead(200, head);
      fs.createReadStream(file).pipe(res);
    } catch (err) {
      html.send500(res, err);
    }
  } else {
    html.send404(res, file);
  }
};

Server.prototype.checkCacheType = function(req, reducedData) {
  let url = utils.tidyUrl(req.url);
  let type = this.cacheMap.check(req.method, url, reducedData);
  return type;
};

module.exports = Server;
