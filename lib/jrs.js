'use strict';

const vm = require('vm');
const fs = require('fs');
const url = require('url');
const path = require('path');
const querystring = require('querystring');
const header = require('./header');
const html = require('./html');
const mimetype = require('./mimetype');
const CRLF = '\r\n';

const Jrs = function(options, jrsFile, socket, head, rfd){
  this.baseDir = options.substitutePath;
  this.tempDir = options.tempPath;
  this.jrsFile = jrsFile;
  this.socket = socket;
  this.context = { // inject context
    'console':  console,
    'require':  require
  };
  this.availableProperties = ['echo', 'end', 'sendFile', 'setMime', 'setCookie', 'setHeader',
    '$_GET', '$_POST', '$_COOKIE', '$_HEADER', '$_FILES', '$_TEMP'];
  html.init(options);
  this.createEnv(head, rfd);
  // JRScript timeout
  this.socket.setTimeout(30e3, ()=>{
    this.serviceError('JRS timeout!');
  });
};

Jrs.prototype.start = function(){
  this.createRes();
  this.createContext();
  this.createInjectScript();
  try {
    let code = fs.readFileSync(this.jrsFile).toString();
    let script = vm.createScript(this.injectScript + code);
    script.runInNewContext(this.context);
  } catch (err) {
    this.serviceError(err);
  }
};

Jrs.prototype.createResponseHead = function(code, length, mime, cookie, heads) {
  let strCookie = querystring.stringify(cookie, '; ');
  let newHead = Object.assign({}, heads, {cookie:strCookie});
  return html.packHead(code, length, mime, newHead);
};

Jrs.prototype.responseText = function(res) {
  let data = res.body;
  let head = this.createResponseHead(200, data.length, res.mime, res.cookie, res.header);
  this.socket.write(head);
  this.socket.write(data);
  this.socket.setTimeout(0);
};

Jrs.prototype.responseFile = function(fileName, res) {
  try {
    let mime = res.mime || html.checkMime(fileName);
    let data = fs.readFileSync(path.resolve(this.baseDir, fileName));
    let head = this.createResponseHead(200, data.length, mime, res.cookie, res.header);
    this.socket.write(head);
    this.socket.write(data);
  } catch (err) {
    this.serviceError(err);
  }
  this.socket.setTimeout(0);
};

Jrs.prototype.createEnv = function(head, rfd) {
  let jh = head.toJson(), u = url.parse(jh.url);
  this.__env = {
    GET : querystring.parse(u.query),
    POST : rfd.formData,
    COOKIE : querystring.parse(jh.cookie, '; '),
    HEADER : jh,
    FILES : rfd.files,
    TEMP : this.tempDir
  };
};

Jrs.prototype.createRes = function() {
  this.__res = {
    body:'', cookie:{}, header:{},
    end : this.responseText.bind(this),
    sendFile : this.responseFile.bind(this)
  };
};

Jrs.prototype.createInjectScript = function(script) {
  this.injectScript = 'const __JRScript__ = require("./jrscript");' +
    'const {'+this.availableProperties.join(',')+'} = new __JRScript__(__env, __res);';
  this.injectScript += (script || '');
  this.injectScript += ';';
};

Jrs.prototype.createContext = function() {
  this.context['__env'] =   this.__env;
  this.context['__res'] =   this.__res;
};

Jrs.prototype.serviceError = function(err) {
  this.socket.write(html.send500(err));
};

module.exports = Jrs;