'use strict';
const net = require('net');
const fs = require('fs');
const xecho = require('./xecho');
const utils = require('./utils');
const RESPONSE_FIRST_LINE_PATTERN = /^HTTP\/\d\.\d \d{3} /;

const Proxy = function(host, port, res, timeout) {
  this.res = res;
  this.timeout = timeout;
  this.cache = {};
  this.socket = new net.Socket({
    readable:true,
    writable:true,
    allowHalfOpen:true
  });
  this.socket.on('data', (buf)=>{
    let line = buf.toString('ascii', 0, buf.indexOf('\r\n'));
    this.setTimeout(0); // off timeout
    if (RESPONSE_FIRST_LINE_PATTERN.test(line)) {
      this.forwardCacheQueue();
      try {
        if (this.cache.needCache) fs.writeFile(this.cache.file, buf);
      } catch (err) {}
    } else {
      try {
        if (this.cache.needCache) fs.appendFile(this.cache.file, buf);
      } catch (err) {}
    }
    this.res.write(buf);
  });
  this.socket.on('close', ()=>null);
  this.socket.on('end', ()=>null);
  this.socket.on('error', (err)=>{
    xecho('PROXY ERR: connect ' + err.errno + ', at host ' + host + ':' + port, 'error');
    this.res.destroy();
  });
  
  this.socket.connect({host: host, port: port});
  this.__cacheQueue = [{needCache:false, file:''}]; // cache queue
};

Proxy.prototype.write = function(data, encoding) {
  if (encoding) {
    this.socket.write(data, encoding);
  } else {
    this.socket.write(data);
  }
};

Proxy.prototype.setTimeout = function(timeout) {
  this.socket.setTimeout(timeout || 0, ()=>{
    this.forwardCacheQueue();
    if (this.cache.needCache) {
      try {
        this.res.write(fs.readFileSync(this.cache.file));
        this.res.destroy();
        xecho('PROXY ERR: RESPONSE_TIMEOUT, using old cache', 'warn');
      } catch (err) {
        xecho('PROXY ERR: RESPONSE_TIMEOUT, and cache is also invalid', 'error');
        this.res.destroy();
      }
    } else {
      xecho('PROXY ERR: RESPONSE_TIMEOUT, but you are not allowed to cache it, so...', 'error');
      this.res.destroy();
    }
    this.socket.destroy();
  });
};

Proxy.prototype.forwardCacheQueue = function() {
  this.__cacheQueue.shift();
  this.cache = this.__cacheQueue[0] || {};
};

Proxy.prototype.pushCacheQueue = function(needCache, file) {
  this.__cacheQueue.push({needCache, file});
};

module.exports = Proxy;
