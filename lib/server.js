'use strict';

const net = require('net');
const fs = require('fs');
const path = require('path');
const xecho = require('./xecho');
const header = require('./header');
const reduceFormData = require('./reduceFormData');
const proxy = require('./proxy');
const utils = require('./utils');
const cacheMap = require('./cacheMap');
const html = require('./html');
const Jrs = require('./jrs');
const pkg = require('../package.json');
const REQUEST_FIRST_LINE_PATTERN = /^[A-Z]+ \/.* HTTP\/\d.\d$/;

const cwd = process.cwd();
const SPLIT_LINE = '=================================================================';

const Server = function(options) {
  this.opt = options;
  this.opt.version = pkg.version;
  this.svr = net.createServer((socket)=>this.newSocket(socket));
  this.svr.listen({port: this.opt.jrPort});
  this.cacheTime = utils.parseExpires(this.opt.cacheTime);
  this.proxyTimeout = utils.parseExpires(this.opt.proxyTimeout);
  cacheMap.init(this.opt.rules);
  html.init(this.opt);
  xecho('Welcome! JR server is running on port ' + this.opt.jrPort);
  xecho(SPLIT_LINE);
};

/**
 * New socket handle
 * @param  {object}  socket
 */
Server.prototype.newSocket = function(socket){
  let myproxy, head, rfd, needProxy = false, cacheType, recvEntityLength, reqFinished;
  socket.on('data', (buf)=>{
    let line = buf.toString('ascii', 0, buf.indexOf('\r\n'));
    if (REQUEST_FIRST_LINE_PATTERN.test(line)) { // It's a new request.
      let bodyIdx = buf.indexOf('\r\n\r\n');
      let host = this.opt.host + (this.opt.port!=80?':'+this.opt.port:'');
      head = new header(buf.toString('ascii', 0, bodyIdx));
      let h = head.toJson();
      needProxy = false;
      buf = buf.slice(bodyIdx+4); // entity
      recvEntityLength = buf.length;
      rfd = new reduceFormData(this.opt, h);
      rfd.feed(buf);
      head.setHeader('host', host);
      cacheType = this.checkCacheType(head, rfd);
      reqFinished = h.method==='GET' || recvEntityLength==rfd.header['content-length'];
      switch (cacheType.type) {
        case 0: // Need proxy, cache to fastmap
          xecho('PROXY: ' + h.method + ' ' + h.url, 'proxy');
          cacheMap.updateMap(cacheType.key);
          needProxy = true;
        break;
        case 1: // JRScript substitution
          xecho('JRS: ' + h.method + ' ' + h.url + ' => ' + cacheType.subs, 'jrs');
          if (reqFinished) this.execJrs(cacheType, socket, head, rfd);
        break;
        case 2: // Normal substitution
          xecho('SUBS: ' + h.method + ' ' + h.url + ' => ' + cacheType.subs, 'warn');
          this.readSubs(cacheType, socket);
        break;
        case 3: // Not allow cache
          xecho('PROXY[NOCACHE]: ' + h.method + ' ' + h.url, 'warn');
          needProxy = true;
        break;
        case 4: // in fastmap
          if (!this.readCache(cacheType, socket)) { // No cache file
            xecho('PROXY: ' + h.method + ' ' + h.url, 'proxy');
            cacheMap.updateMap(cacheType.key);
            needProxy = true;
          } else {
            xecho('CACHE: ' + h.method + ' ' + h.url, 'cache');
          }
        break;
        case 5: // in slowmap
          if (!this.readCache(cacheType, socket)) { // No cache file
            xecho('PROXY: ' + h.method + ' ' + h.url, 'proxy');
            cacheMap.updateMap(cacheType.key, true);
            needProxy = true;
          } else {
            xecho('CACHE: ' + h.method + ' ' + h.url, 'cache');
          }
        break;
        case 6: // Need proxy, cache to slowmap & fastmap
          xecho('PROXY: ' + h.method + ' ' + h.url, 'proxy');
          cacheMap.updateMap(cacheType.key);
          needProxy = true;
        break;
      }
      if (needProxy) {
        myproxy = myproxy || new proxy(this.opt.host, this.opt.port, socket, this.proxyTimeout);
        myproxy.pushCacheQueue(cacheType.type!==3, path.resolve(this.opt.cachePath, cacheType.key));
        head.delHeader('If-Modified-Since');
        head.delHeader('If-None-Match');
        myproxy.setTimeout(this.proxyTimeout);
        myproxy.write(head+'\r\n');
        myproxy.write(buf);
      }
    } else if (buf.length) {
      recvEntityLength += buf.length;
      reqFinished = recvEntityLength==rfd.header['content-length'];
      rfd.feed(buf);
      if (reqFinished && cacheType.type===1) this.execJrs(cacheType, socket, head, rfd);
      if (needProxy && myproxy) myproxy.write(buf);
    }
    if (cacheType.type===1) {
      rfd.saveFileBuffer();
    }
  });
  socket.on('end', ()=>null);
  socket.on('close', ()=>{
    // console.log('close');
  });
  socket.on('error', (err)=>{
    // console.log('====SOCKET====', err);
  });
};

Server.prototype.readCache = function(ct, socket) {
  let time = +new Date();
  let file = path.resolve(this.opt.cachePath , ct.key);
  let result = false;
  if (time - ct.time < this.cacheTime) {
    try {
      socket.write(fs.readFileSync(file));
      socket.end();
      result = true;
    } catch (err) {}
  }
  return result;
};

Server.prototype.execJrs = function(ct, socket, head, buf) {
  let file = path.resolve(this.opt.substitutePath, ct.subs);
  try {
    let jrs = new Jrs(this.opt, file, socket, head, buf);
    jrs.start();
  } catch (err) {
    socket.write(html.send404(file));
  }
};

Server.prototype.readSubs = function(ct, socket) {
  let file = path.resolve(this.opt.substitutePath, ct.subs);
  try {
    let extraHead = {'Access-Control-Allow-Origin': '*'};
    let data = fs.readFileSync(file);
    let head = html.packHead(200, data.length, html.checkMime(file), extraHead);
    socket.write(head);
    socket.write(data);
    socket.end();
  } catch (err) {
    socket.write(html.send404(file));
  }
};

Server.prototype.checkCacheType = function(head, reducedData) {
  let h = head.toJson();
  let u = utils.tidyUrl(h.url);
  let type = cacheMap.check(h.method, u, reducedData);
  return type;
};

module.exports = Server;
