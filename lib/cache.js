'use strict';

const Transform = require('stream').Transform;
const httpCode = require('./httpCode');
const fs = require('fs');
const CRLF = '\r\n';

class Cache extends Transform {
  constructor(filepath) {
    super();
    this._cache = filepath ? fs.createWriteStream(filepath) : null;
    this._statusCode = 200;
  }

  writeHead(httpVersion, code, head) {
    if (!this._cache) return;
    this._statusCode = parseInt(code);
    if (this._statusCode !== 200) return;
    let strHead = 'HTTP/' + httpVersion + ' ' + httpCode[code] + CRLF;
    for (let k in head) {
      strHead += k + ': ' + head[k] + CRLF;
    }
    strHead += CRLF;
    this._cache.write(strHead);
  }

  _transform(chunk, encoding, callback) {
    if (this._cache && this._statusCode === 200) {
      this._cache.write(chunk);
    }
    this.push(chunk);
    callback();
  }

  _flush(cb){
    if (this._cache) {
      this._cache.end();
    }
    cb();
  }
}

module.exports = Cache;
