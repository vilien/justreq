'use strict';

const Transform = require('stream').Transform;
const CRLF = '\r\n';
const querystring = require('querystring');

class CacheToResponse extends Transform {
  constructor(socket) {
    super();
    this._socket = socket;
    this._writedHead = false;
    this._strHead = '';
  }

  getHead(str) {
    let arr = str.split(CRLF);
    let code = arr.shift().split(' ')[1];
    let head = querystring.parse(arr.join('&'), '&', ': ');
    return {code, head};
  }

  _transform(chunk, encoding, callback) {
    if (!this._writedHead) {
      let idx = chunk.indexOf(CRLF + CRLF);
      if (idx > -1) {
        let head;
        this._strHead += chunk.toString('ascii', 0, idx);
        this._writedHead = true;
        head = this.getHead(this._strHead);
        this._socket.writeHead(head.code, head.head);
        this.push(chunk.slice(idx + 4));
      } else {
        this._strHead += chunk.toString('ascii');
      }
    } else {
      this.push(chunk);
    }
    callback();
  }

  _flush(cb){
    cb();
  }
}

module.exports = CacheToResponse;
