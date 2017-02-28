'use strict';

const https = require('https');
const http = require('http');
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const cache = require('./cache');
const xecho = require('./xecho');
const html = require('./html');
const utils = require('./utils');

class Proxy {
  constructor(opt, req, res, attachedHead, cacheFileName, chunk) {
    this.host = opt.host;
    this.port = opt.port;
    this.cltReq = req;
    this.cltRes = res;
    this.onHttps = opt.proxyHttps === 'auto' ? opt.port == 443 : opt.proxyHttps === 'yes';
    this.onCors = opt.onCors;

    let head = Object.assign({}, req.headers, {'accept-encoding': 'gzip,deflate'});
    head.host = this.host;
    delete head['if-modified-since'];
    delete head['if-none-match'];
    html.init(opt);

    this.options = {
      hostname: this.host,
      port: this.port,
      path: req.url,
      method: req.method,
      agent: false,
      headers: head
    };
    this.loadSslOptions(opt);

    this.cachePath = cacheFileName ? path.resolve(opt.cachePath, cacheFileName) : '';
    this.socket = this.onHttps ? https.request(this.options) : http.request(this.options);
    this.socket.on('socket', ()=>{
      if (chunk) this.socket.write(chunk);
      req.pipe(this.socket);
      req.resume();
    });
    this.socket.on('response', (res)=>this.response(res, attachedHead));
    this.socket.on('error', (err)=>this.error(err));
    this.socket.setTimeout(utils.parseExpires(opt.proxyTimeout), ()=>this.setTimeout());
    // this.socket.end();
  }

  loadSslOptions(opt) {
    if (opt.ssl_ca) {
      try {
        this.options.ca = fs.readFileSync(opt.ssl_ca);
      } catch (e) {}
    }
    if (opt.ssl_key) {
      try {
        this.options.key = fs.readFileSync(opt.ssl_key);
      } catch (e) {}
    }
    if (opt.ssl_cert) {
      try {
        this.options.cert = fs.readFileSync(opt.ssl_cert);
      } catch (e) {}
    }
  }

  response(res, attachedHead) {
    res.pause();
    let head = html.tidyHeadTitle(Object.assign({}, res.headers));
    let cachePipe = new cache(this.cachePath);
    delete head['Content-Encoding'];
    this.cltRes.sendHead(res.statusCode, head);
    cachePipe.writeHead(res.httpVersion, res.statusCode, Object.assign(attachedHead, head));
    switch (res.headers['content-encoding']) {
    case 'gzip':
      res.pipe(zlib.createGunzip()).pipe(cachePipe).pipe(this.cltRes);
      break;
    case 'deflate':
      res.pipe(zlib.createInflate()).pipe(cachePipe).pipe(this.cltRes);
      break;
    default:
      res.pipe(cachePipe).pipe(this.cltRes);
      break;
    }
    res.resume();
  }

  error(err) {
    if (this.cachePath) {
      if (utils.fsExistsSync(this.cachePath, fs.R_OK)) {
        fs.createReadStream(this.cachePath).pipe(this.cltRes);
        xecho('PROXY ERR: ' + err.errno + ', using old cache', 'warn', true);
      } else {
        html.send500(this.cltRes, err);
        xecho('PROXY ERR: ' + err + ', and cache is also invalid', 'error', true);
      }
    } else {
      html.send500(this.cltRes, err);
      xecho('PROXY ERR: ' + err.errno + ', but you are not allowed to cache this, so...', 'error', true);
    }
    this.cltRes.end();
  }

  setTimeout() {
    let err = {
      code: 'RESPONSE_TIMEOUT',
      errno: 'RESPONSE_TIMEOUT',
      toString: ()=>'connect timeout'
    };
    this.socket.destroy(err);
  }
};

module.exports = Proxy;
