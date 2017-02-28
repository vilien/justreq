const html = require('../lib/html');
const expect = require('chai').expect;
const {Writable} = require('stream');

class MySocket extends Writable{
  constructor(options){
    super();
    this.writeCb = options.write || function(){};
    this.writeHeadCb = options.writeHead || function(){};
  }
  _write(chunk){
    this.writeCb(chunk);
  }
  writeHead(code, head){
    this.writeHeadCb(code, head);
  }
}

describe('Html test', function(){

  before(function(){
    let options = {version: '8.8.8'};
    html.init(options);
  });

  it('init() test', function(){
    expect(html.version).to.be.equal('8.8.8');
  });

  it('send400() test', function(done){
    let socket = new MySocket({
      writeHead: function(code, head){
        this.head = code + head['Server'];
      },
      write: function(){
        expect(this.head).to.be.equal('400JR Server/8.8.8');
        done();
      }
    });
    html.send400(socket, '400err');
  });

  it('send404() test', function(done){
    let socket = new MySocket({
      writeHead: function(code, head){
        this.head = code + head['Server'];
      },
      write: function(){
        expect(this.head).to.be.equal('404JR Server/8.8.8');
        done();
      }
    });
    html.send404(socket, '404notfound');
  });

  it('send500() test', function(done){
    let socket = new MySocket({
      writeHead: function(code, head){
        this.head = code + head['Server'];
      },
      write: function(){
        expect(this.head).to.be.equal('500JR Server/8.8.8');
        done();
      }
    });
    html.send500(socket, '500err');
  });

  describe('packHead() test', function(){
    it('head 200', function(){
      let head = html.packHead(200, 'text/html', {TestHeader: 'Test 0.1'});
      expect(head).to.match(/^HTTP\/1.1 200 OK/)
        .and.contain('\r\nServer: JR Server/8.8.8\r\n')
        .and.contain('\r\nContent-Type: text/html\r\n')
        .and.contain('\r\nTestHeader: Test 0.1\r\n');
    });
    it('head 404', function(){
      let head = html.packHead(404, 'image/png');
      expect(head).to.match(/^HTTP\/1.1 404 Not Found/)
        .and.contain('\r\nServer: JR Server/8.8.8\r\n')
        .and.contain('\r\nContent-Type: image/png\r\n');
    });
  });

  it('tidyHeadTitle() test', function(){
    expect(html.tidyHeadTitle({'aaa-bbb': 'ab', 'ccc-ddd': 'cd'})).to.be.deep
      .equal({'Aaa-Bbb': 'ab', 'Ccc-Ddd': 'cd'});
  });

  it('packBody() test', function(){
    let template = '<div id="{{userId}}">name:{{userName}}</div>';
    let data = {userId: 1001, userName: 'Lily'};
    expect(html.packBody(template, data)).to.be.equal('<div id="1001">name:Lily</div>');
  });

  describe('checkMime() test', function(){
    it('js check', function(){
      expect(html.checkMime('http://host/jQuery.min.js')).to.be
        .equal('application/javascript');
    });
    it('css check', function(){
      expect(html.checkMime('/styles/style.css')).to.be.equal('text/css');
    });
    it('gif check', function(){
      expect(html.checkMime('images/123.gif')).to.be.equal('image/gif');
    });
    it('html check', function(){
      expect(html.checkMime('index.html')).to.be.equal('text/html');
    });
  });

});