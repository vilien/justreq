const JRScript = require('../lib/jrscript');
const expect = require('chai').expect;

class MyResponse {
  constructor(cb) {
    this.cb = cb || function(){};
  }
  end(res) {
    this.cb(res);
  }
  sendFile(fileName, res) {
    this.cb(res, fileName);
  }
}

describe('JRScript test', function(){

  it('echo() test', function(done){
    let res = new MyResponse(function(res){
      expect(res.body).to.be.equal('There is only one happiness in life, to love and be loved.--Anon');
      done();
    });
    let jrs = new JRScript({}, res);
    jrs.echo('There is only one happiness in life, to love and be loved.');
    jrs.end('--Anon');
  });

  it('echo(json) test', function(done){
    let res = new MyResponse(function(res){
      let result = 'MIME:' + res.mime + ' BODY:' + res.body;
      expect(result).to.be.equal('MIME:application/json BODY:{"bookName": "Pride and Prejudice"}');
      done();
    });
    let jrs = new JRScript({}, res);
    jrs.echo('{"bookName": "Pride and Prejudice"}');
    jrs.end();
  });

  it('sendFile() test', function(done){
    let res = new MyResponse(function(res, fileName){
      expect(fileName).to.be.equal('/path/somefile.txt');
      done();
    });
    let jrs = new JRScript({}, res);
    jrs.sendFile('/path/somefile.txt');
  });

  it('setMime() test', function(done){
    let res = new MyResponse(function(res){
      expect(res.mime).to.be.equal('application/javascript');
      done();
    });
    let jrs = new JRScript({}, res);
    jrs.setMime('js');
    jrs.end();
  });

  it('setCookie() test', function(done){
    let env = {COOKIE: {}};
    let res = new MyResponse(function(res){
      expect(res.cookie.join(';')).to.be.contain('name=Bruce');
      done();
    });
    let jrs = new JRScript(env, res);
    jrs.setCookie('name', 'Bruce');
    jrs.end();
  });

  it('setHeader() test', function(done){
    let res = new MyResponse(function(res){
      expect(res.header['name']).to.be.contain('Soapia');
      done();
    });
    let jrs = new JRScript({}, res);
    jrs.setHeader('name', 'Soapia');
    jrs.end();
  });

  it('$_GET test', function(){
    let env = {GET: {'userId': 1001}};
    let res = new MyResponse;
    let jrs = new JRScript(env, res);
    expect(jrs.$_GET['userId']).to.be.equal(1001);
  });

  it('$_POST test', function(){
    let env = {POST: {'height': 172}};
    let res = new MyResponse;
    let jrs = new JRScript(env, res);
    expect(jrs.$_POST['height']).to.be.equal(172);
  });

  it('$_COOKIE test', function(){
    let env = {COOKIE: {'uuid': '1B57333D7209AC0'}};
    let res = new MyResponse;
    let jrs = new JRScript(env, res);
    expect(jrs.$_COOKIE['uuid']).to.be.equal('1B57333D7209AC0');
  });

  it('$_HEADER test', function(){
    let env = {HEADER: {'Some-Head': 'h002'}};
    let res = new MyResponse;
    let jrs = new JRScript(env, res);
    expect(jrs.$_HEADER['Some-Head']).to.be.equal('h002');
  });

  it('$_FILES test', function(){
    let env = {FILES: [{'name': 'file2.txt', 'size': 15}]};
    let res = new MyResponse;
    let jrs = new JRScript(env, res);
    expect(jrs.$_FILES[0]).to.be.deep.include({'name': 'file2.txt', 'size': 15});
  });
  
});