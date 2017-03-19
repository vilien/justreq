const proxy = require('../lib/proxy');
const expect = require('chai').expect;
const fs = require('fs');
const Mitm = require('mitm');
const {Readable, Writable} = require('stream');

class MySocket extends Writable{
  constructor(options){
    super();
    this.writeCb = options.write || function(){};
    this.writeHeadCb = options.writeHead || function(){};
  }
  _write(chunk){
    this.writeCb(chunk);
  }
  sendHead(code, head){
    this.writeHead(code, head);
  }
  writeHead(code, head){
    this.writeHeadCb(code, head);
  }
}

class MyRequest extends Readable{
  constructor(options){
    super();
    this.method = options.method || 'GET';
    this.path = options.path || options.url || '/getInfo.do';
    this.url = this.path;
    this.port = options.port || 80;
    this.headers = Object.assign({}, options.body ? {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(options.body || '')
    } : {}, options.headers);
    this.body = options.body || null;
  }
  _read(size){
    if (this.body) this.push(Buffer.from(this.body));
    this.push(null);
  }
}

describe('Proxy test', function(){
  let defaultOptions, mitm, cacheFile;

  before(function(){
    defaultOptions = {
      version: '8.8.8',
      host: '127.0.0.1',
      port: 80,
      proxyHttps: 'auto',
      onCors: true,
      cachePath: './tmp/',
      proxyTimeout: '6s'
    };
    try {
      fs.accessSync('./tmp', fs.F_OK);
    } catch (e){
      fs.mkdirSync('./tmp');
    }
  });

  beforeEach(function(){
    cacheFile = 'cache' + (+new Date + Math.random()) + '.tmp';
    mitm = Mitm();
  });

  afterEach(function(){
    try {
      fs.unlinkSync(defaultOptions.cachePath + cacheFile);
    } catch (err) {}
  });

  it('http proxy', function(done){
    let isHttp = false;
    let req = new MyRequest({
      method: 'GET',
      path: '/getInfo.do'
    });
    let res = new MySocket({
      write: function(data) {
        expect(isHttp && data.toString('utf8')).to.be
          .equal('If you saw the darkness in front of you, don\'t be afraid, that\'s because sunshine is at your back.');
        done();
      }
    });
    mitm.on('request', function(req, res) {
      res.write('If you saw the darkness in front of you, don\'t be afraid, that\'s because sunshine is at your back.');
      res.end();
    });
    mitm.on('connect', function(socket, opt){
      isHttp = socket.constructor.name === 'Socket';
    });
    new proxy(defaultOptions, req, res, {}, cacheFile);
  });

  it('https proxy', function(done){
    let isHttps = false;
    let opt = Object.assign({}, defaultOptions, {port: 443});
    let req = new MyRequest({
      method: 'GET',
      path: '/getInfo.do'
    });
    let res = new MySocket({
      write: function(data) {
        expect(isHttps && data.toString('utf8')).to.be
          .equal('HTTPS is the HTTP protocol over TLS/SSL.');
        done();
      }
    });
    mitm.on('request', function(req, res) {
      res.write('HTTPS is the HTTP protocol over TLS/SSL.');
      res.end();
    });
    mitm.on('connect', function(socket, opt){
      isHttps = socket.constructor.name === 'TlsSocket';
    });
    new proxy(opt, req, res, {}, cacheFile);
  });

  it('error test', function(done){
    let req = new MyRequest({
      method: 'GET',
      path: '/getInfo.do'
    });
    let res = new MySocket({
      writeHead: function(code, res) {
        expect(code).to.be.equal(500);
        done();
      }
    });
    let prx = new proxy(defaultOptions, req, res, {}, cacheFile);
    let err = {
      code: 'RESPONSE_TIMEOUT',
      errno: 'RESPONSE_TIMEOUT',
      toString: ()=>'connect timeout'
    };
    prx.error(err);
  });

  it('timeout test', function(done){
    let req = new MyRequest({
      method: 'GET',
      path: '/getInfo.do'
    });
    let res = new MySocket({
      writeHead: function(code, res) {
        expect(code).to.be.equal(500);
        done();
      }
    });
    let prx = new proxy(defaultOptions, req, res, {}, cacheFile);
    prx.setTimeout();
  });

  it('cache test', function(done){
    let req = new MyRequest({
      method: 'GET',
      path: '/getInfo.do'
    });
    let res = new MySocket({
      write: function(data) {
        setTimeout(function(){
          let cache = fs.readFileSync(defaultOptions.cachePath + cacheFile, {encoding: 'utf8'});
          expect(cache).to.be.match(/^HTTP\/1.1 200 OK/).and
            .contain('\r\n\r\nGo as far as you can see; when you get there you\'ll be able to see farther.');
          done();
        }, 5);
      }
    });
    mitm.on('request', function(req, res) {
      res.write('Go as far as you can see; when you get there you\'ll be able to see farther.');
      res.end();
    });
    new proxy(defaultOptions, req, res, {}, cacheFile);
  });

  it('loadSslOptions() test', function(done){
    let opt = Object.assign({}, defaultOptions, {
      'ssl_ca': './tmp/ssl_ca.tmp',
      'ssl_key': './tmp/ssl_key.tmp',
      'ssl_cert': './tmp/ssl_cert.tmp'
    });
    let req = new MyRequest({});
    let res = new MySocket({});
    fs.writeFileSync('./tmp/ssl_ca.tmp', 'ssl_ca:c3NsX2Nh');
    fs.writeFileSync('./tmp/ssl_key.tmp', 'ssl_ca:c3NsX2tleQ==');
    fs.writeFileSync('./tmp/ssl_cert.tmp', 'ssl_ca:c3NsX2NlcnQ=');
    setTimeout(function(){
      let prx = new proxy(opt, req, res, {}, cacheFile);
      expect(prx.options.ca + prx.options.key + prx.options.cert).to.be
        .equal('ssl_ca:c3NsX2Nhssl_ca:c3NsX2tleQ==ssl_ca:c3NsX2NlcnQ=');
      done();
      fs.unlinkSync('./tmp/ssl_ca.tmp');
      fs.unlinkSync('./tmp/ssl_key.tmp');
      fs.unlinkSync('./tmp/ssl_cert.tmp');
    }, 5);
  });
});