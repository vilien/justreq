const Jrs = require('../lib/jrs');
const expect = require('chai').expect;
const fs = require('fs');
const http = require('http');
const querystring = require('querystring');
const Mitm = require('mitm');

function httpPost(options, data, cb, isMult){
  let postData = isMult ? data : querystring.stringify(data);
  let settings = Object.assign({
    hostname: '127.0.0.1',
    port: 80,
    path: '/upload',
    method: 'POST',
    headers: {
      'Content-Type': isMult ? 'multipart/form-data; boundary=AaB03x' : 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, options);
  let req = http.request(settings, function(res) {
    res.setEncoding('utf8');
    res.on('data', function(data){
      cb(data, res);
    });
  });
  if (settings.method !== 'GET') req.write(postData);
  req.end();
}

describe('Jrs test', function(){
  let jrsFile, mitm, tmpPath = './tmp';

  before(function(){
    try {
      fs.accessSync(tmpPath, fs.F_OK);
    } catch (e){
      fs.mkdirSync(tmpPath);
    }
  });

  beforeEach(function(){
    mitm = Mitm();
    jrsFile = tmpPath + '/jrs-' + (+new Date) + '.tmp';
  });

  afterEach(function(){
    mitm.disable();
    try {
      fs.unlinkSync(jrsFile);
    } catch (err) {}
  });

  it('createResponseHead() test', function(){
    expect(Jrs.prototype.createResponseHead('text/html', ['a=1;', 'b=2;'], {'hd': 'x'})).to.be
      .deep.equal({'Content-Type': 'text/html', 'Set-Cookie': ['a=1;', 'b=2;'], 'Hd': 'x'});
  });

  it('get & echo($_GET)', function(done){
    let jrsCode = 'echo($_GET);end("===");';
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    fs.writeFileSync(jrsFile, jrsCode);
    http.get('http://127.0.0.1/abc.jrs?id=1001', function(res){
      res.setEncoding('utf8');
      res.on('data', function(data){
        expect(data).to.be.equal('{"id":"1001"}===');
        done();
      });
    });
  });

  it('get & sendFile("jrs.get.tmp")', function(done){
    let jrsCode = 'sendFile("./tmp/jrs.get.tmp");';
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    fs.writeFileSync('./tmp/jrs.get.tmp', 'Talk is cheap, show me the code.');
    fs.writeFileSync(jrsFile, jrsCode);
    http.get('http://127.0.0.1/abc.jrs', function(res){
      res.setEncoding('utf8');
      res.on('data', function(data){
        expect(data).to.be.equal('Talk is cheap, show me the code.');
        fs.unlinkSync('./tmp/jrs.get.tmp');
        done();
      });
    });
  });

  it('POST & echo($_POST)', function(done){
    let jrsCode = 'echo($_POST);end();';
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    fs.writeFileSync(jrsFile, jrsCode);
    httpPost({}, {userName: 'Lily'}, function(data){
      expect(data).to.be.equal('{"userName":"Lily"}');
      done();
    });
  });

  it('POST & sendFile("jrs.post.tmp")', function(done){
    let jrsCode = 'sendFile("./tmp/jrs.post.tmp");';
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    fs.writeFileSync('./tmp/jrs.post.tmp', 'Hi, my name is Lily. I\'m a sunny girl.');
    fs.writeFileSync(jrsFile, jrsCode);
    httpPost({}, {userName: 'Lily'}, function(data){
      expect(data).to.be.equal('Hi, my name is Lily. I\'m a sunny girl.');
      fs.unlinkSync('./tmp/jrs.post.tmp');
      done();
    });
  });

  it('echo($_HEADER)', function(done){
    let jrsCode = 'echo("H-" + $_HEADER["header1"] + " C-" + $_COOKIE["userName"]);end();';
    let headers = {
      'cookie': 'userName=Lily; sex=female;',
      'header1': 'h001'
    };
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    fs.writeFileSync(jrsFile, jrsCode);
    httpPost({method: 'GET', headers: headers}, {}, function(data){
      expect(data).to.be.equal('H-h001 C-Lily');
      done();
    });
  });

  it('get & echo(Binary)', function(done){
    let jrsCode = 'echo(Buffer.from([0x62,0x75,0x66,0x66,0x65,0x72]));end();';
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    fs.writeFileSync(jrsFile, jrsCode);
    http.get('http://127.0.0.1/abc.jrs?id=1001', function(res){
      res.setEncoding('utf8');
      res.on('data', function(data){
        expect(data).to.be.equal('buffer');
        done();
      });
    });
  });

  it('upload file', function(done){
    let jrsCode = 'echo($_FILES["file"]);end();';
    let fileData = '--AaB03x\r\n';
    fileData += 'Content-Disposition: form-data; name="file"; filename="file1.txt"\r\n';
    fileData += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
    fileData += 'hello world!\r\n';
    fileData += '--AaB03x--';
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    fs.writeFileSync(jrsFile, jrsCode);
    httpPost({}, fileData, function(data){
      let json = JSON.parse(data);
      expect(json).to.be.deep.include({'name': 'file1.txt', 'size': 12});
      done();
    }, true);
  });

  it('400 status', function(done){
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    httpPost({headers: {}}, {}, function(data, res){
      expect(res.statusCode).to.be.equal(400);
      done();
    });
  });

  it('404 status', function(done){
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, 'no_exists_file.txt', req, res);
    });
    http.get('http://127.0.0.1/abc.jrs?id=1001', function(res){
      res.setEncoding('utf8');
      res.on('data', function(data){
        expect(res.statusCode).to.be.equal(404);
        done();
      });
    });
  });

  it('500 status', function(done){
    let jrsCode = 'echo(';
    mitm.on('request', function(req, res) {
      res.sendHead = res.writeHead;
      new Jrs({version: '1.1.1'}, jrsFile, req, res);
    });
    fs.writeFileSync(jrsFile, jrsCode);
    http.get('http://127.0.0.1/abc.jrs', function(res){
      res.setEncoding('utf8');
      res.on('data', function(data){
        expect(res.statusCode).to.be.equal(500);
        done();
      });
    });
  });
});