'use strict';

const Transform = require('stream').Transform;
const httpCode = require('./httpCode');
const fs = require('fs');
const CRLF = '\r\n';

class Cache extends Transform {
  constructor(filepath) {
    super();
    this._cache = filepath ? fs.createWriteStream(filepath) : null;
  }

  writeHead(httpVersion, code, head) {
    if (!this._cache) return;
    let strHead = 'HTTP/'+ httpVersion + ' ' + httpCode[code] + CRLF;
    for (let k in head) {
      strHead += k + ': ' + head[k] + CRLF;
    }
    strHead += CRLF;
    this._cache.write(strHead);
  }

  _transform(chunk, encoding, callback) {
    if (this._cache) {
      this._cache.write(chunk);
    }
    this.push(chunk);
    callback();
  }

  _flush(cb){
    cb();
  }
}

module.exports = Cache;