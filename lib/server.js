'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const xecho = require('./xecho');
const reduceFormData = require('./reduceFormData');
const proxy = require('./proxy');
const utils = require('./utils');
const cacheMap = require('./cacheMap');
const html = require('./html');
const mimetype = require('./mimetype');
const Jrs = require('./jrs');
const cacheToResponse = require('./cacheToResponse');
const pkg = require('../package.json');
const REQUEST_FIRST_LINE_PATTERN = /^[A-Z]+ \/.* HTTP\/\d.\d$/;

const SPLIT_LINE = '=================================================================';

const Server = function(options) {
  this.opt = options;
  this.opt.version = pkg.version;
  this.opt.onCors = this.opt.onCors==='yes';
  this.svr = http.createServer((req, res)=>this.newSocket(req, res));
  this.svr.listen({port: this.opt.jrPort});
  this.cacheTime = utils.parseExpires(this.opt.cacheTime);
  cacheMap.init(this.opt.rules);
  html.init(this.opt);
  xecho('Welcome! JR server is running on port ' + this.opt.jrPort);
  xecho(SPLIT_LINE);
};

Server.prototype.newSocket = function(req, res) {
  let length = parseInt(req.headers['content-length'] || 0), piped = false;
  if (!length) {
    piped = true;
    this.startPipe(req, res);
  }
  req.on('data', (chunk)=>{
    if (!piped) {
      piped = true;
      this.startPipe(req, res, chunk);
    }
  });
};

Server.prototype.startPipe = function(req, res, chunk) {
  let rfd = new reduceFormData(this.opt, req.headers), head = Object.assign({}, req.headers),
    cacheType, needProxy=false;

  req.pause();
  if (chunk) rfd.feed(chunk);
  cacheType = this.checkCacheType(req, rfd);
  switch (cacheType.type) {
    case 0: // Need proxy, cache to fastmap
      xecho('PROXY: ' + req.method + ' ' + req.url, 'proxy', true);
      cacheMap.updateMap(cacheType.key);
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
        cacheMap.updateMap(cacheType.key);
        needProxy = true;
      } else {
        xecho('CACHE: ' + req.method + ' ' + req.url, 'cache', true);
      }
    break;
    case 5: // in slowmap
      if (!this.readCache(cacheType, req, res)) { // No cache file
        xecho('PROXY: ' + req.method + ' ' + req.url, 'proxy', true);
        cacheMap.updateMap(cacheType.key, true);
        needProxy = true;
      } else {
        xecho('CACHE: ' + req.method + ' ' + req.url, 'cache', true);
      }
    break;
    case 6: // Need proxy, cache to slowmap & fastmap
      xecho('PROXY: ' + req.method + ' ' + req.url, 'proxy', true);
      cacheMap.updateMap(cacheType.key);
      needProxy = true;
    break;
  }
  if (needProxy) {
    let cacheFileName = cacheType.type!==3 ? cacheType.key : '';
    new proxy(this.opt, req, res, cacheFileName, chunk);
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
        'Server': 'JR Server/' + this.opt.version,
        'Content-Type': html.checkMime(file)
      };
      this.opt.onCors ? head['Access-Control-Allow-Origin'] = '*' : 0;
      res.writeHead(200, head);
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
  let type = cacheMap.check(req.method, url, reducedData);
  return type;
};

module.exports = Server;
