'use strict';

const mimetype = require('./mimetype');
const DEFAULT_MIME = 'text/plain';

let __env, __res;

class Justreq {

  constructor(env, res) {
    this.__modulePaths__ = module.paths;
    __env = env;
    __res = res;
  }

  echo(str) {
    if (typeof str !== 'string') {
      try {
        str = JSON.stringify(str);
      } catch (err) {
        str = '';
      }
    }
    __res.body += str || '';
  }

  end(str) {
    Justreq.prototype.echo(str);
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

  sendFile(fileName) {
    __res.sendFile(fileName, __res);
  }

  setMime(suffix) {
    __res.mime = mimetype[suffix] || DEFAULT_MIME;
  }

  setCookie(key, value) {
    __res.cookie[key] = value;
    __env.COOKIE[key] = value;
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

module.exports = Justreq;
