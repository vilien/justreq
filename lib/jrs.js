'use strict';

const vm = require('vm');
const fs = require('fs');
const url = require('url');
const path = require('path');
const querystring = require('querystring');
const formidable = require('formidable');
const html = require('./html');
const mimetype = require('./mimetype');
const CRLF = '\r\n';
const cwd = process.cwd();

const Jrs = function(options, jrsFile, req, res, chunk){
  this.version = options.version;
  this.baseDir = cwd;
  this.onCors = options.onCors;
  this.jrsFile = jrsFile;
  this.socket = res;
  this.context = { // inject context
    'console':  console,
    'require':  require
  };
  this.availableProperties = ['echo', 'end', 'sendFile', 'setMime', 'setCookie', 'setHeader',
    '$_GET', '$_POST', '$_COOKIE', '$_HEADER', '$_FILES', '$_TEMP'];
  html.init(options);
  // JRScript timeout
  this.socket.setTimeout(30e3, ()=>this.serviceError('JRS timeout!'));
  this.parseRequest(req, (env)=>this.start(env), chunk);
};

Jrs.prototype.parseRequest = function(req, cb, chunk){
  let head = req.headers;
  let query = querystring.parse(url.parse(req.url).query);
  let form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files)=>{
    if (err) {
      html.send400(this.socket, err);
      return;
    }
    cb({head, query, fields, files});
  });
  if (chunk) form.write(chunk);
};

Jrs.prototype.start = function(env){
  this.createEnv(env);
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

Jrs.prototype.createResponseHead = function(mime, cookies, heads) {
  let head = Object.assign({'Content-Type' : mime}, heads);
  head['Server'] = 'JR Server/' + this.version;
  if (cookies) head['Set-Cookie'] = cookies;
  if (this.onCors) head['Access-Control-Allow-Origin'] = '*';
  return html.tidyHeadTitle(head);
};

Jrs.prototype.responseText = function(res) {
  let data = res.body;
  let head = this.createResponseHead(res.mime, res.cookie, res.header);
  this.socket.writeHead(200, head);
  this.socket.write(res.body);
  this.socket.end();
  this.socket.setTimeout(0);
};

Jrs.prototype.responseFile = function(fileName, res) {
  let file = path.resolve(this.baseDir, fileName);
  if (fs.existsSync(file)) {
    try {
      let mime = res.mime || html.checkMime(fileName);
      let head = this.createResponseHead(mime, res.cookie, res.header);
      this.socket.writeHead(200, head);
      fs.createReadStream(file).pipe(this.socket);
    } catch (err) {
      this.serviceError(err);
    }
  } else {
    html.send404(this.socket, file);
  }
  this.socket.setTimeout(0);
};

Jrs.prototype.createEnv = function(env) {
  this.__env = {
    GET : env.query,
    POST : env.fields,
    COOKIE : querystring.parse(env.head.cookie, '; '),
    HEADER : env.head,
    FILES : env.files
  };
};

Jrs.prototype.createRes = function() {
  this.__res = {
    body:'', cookie:[], header:{},
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
  html.send500(this.socket, err);
};

module.exports = Jrs;