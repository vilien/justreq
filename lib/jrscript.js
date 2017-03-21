'use strict';

const mimetype = require('./mimetype');
const DEFAULT_MIME = 'text/plain';

let __env, __res, __isBinary;

class JRScript {

  constructor(env, res) {
    this.__modulePaths__ = module.paths;
    __isBinary = -1; // -1 - new, 0 - not binary, 1 - is binary
    __env = env;
    __res = res;
    __res.body = __res.body || '';
    __res.cookie = __res.cookie || [];
    __res.header = __res.header || {};
  }

  echo(str) {
    if (__isBinary === -1) {
      if (Buffer.isBuffer(str)) {
        __isBinary = 1;
      } else {
        __isBinary = 0;
      }
    }
    if (__isBinary === 1) {
      __res.write(str, __res);
    } else {
      if (typeof str !== 'string') {
        try {
          str = JSON.stringify(str);
        } catch (err) {
          str = '';
        }
      }
      __res.body += str || '';
    }
  }

  end(str) {
    if (arguments.length) JRScript.prototype.echo(str);
    if (__isBinary === 1) {
      __res.write(null, __res, true);
    } else {
      if (!__res.mime) {
        try { // Try to set mime type as json
          JSON.parse(__res.body);
          __res.mime = mimetype['json'];
        } catch (err) {
          __res.mime = DEFAULT_MIME;
        }
      }
      __res.end(__res);
    }
  }

  sendFile(fileName) {
    __res.sendFile(fileName, __res);
  }

  setMime(suffix) {
    __res.mime = mimetype[suffix] || DEFAULT_MIME;
  }

  setCookie(name, value, expires, path, domain, secure, httponly) {
    let time = expires ? new Date(expires).toGMTString() : '';
    let cookie = `${name}=${value};`;
    cookie += ` path=${path ? path : '/'};`;
    cookie += ` expires=${time};`;
    cookie += domain ? ` domain=${domain};` : '';
    cookie += secure ? ' secure;' : '';
    cookie += httponly ? ' HttpOnly;' : '';
    if (__res.cookie.indexOf(cookie) < 0) {
      __res.cookie.push(cookie);
    }
    __env.COOKIE[name] = value;
  }

  setHeader(key, value) {
    __res.header[key] = value;
  }

  get $_GET() {
    return __env.GET;
  }

  get $_POST() {
    return __env.POST;
  }

  get $_COOKIE() {
    return __env.COOKIE;
  }

  get $_HEADER() {
    return __env.HEADER;
  }

  get $_FILES() {
    return __env.FILES;
  }

  get $_TEMP() {
    return __env.TEMP;
  }

}

module.exports = JRScript;
