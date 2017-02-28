const CacheToResponse = require('../lib/cacheToResponse.js');
const expect = require('chai').expect;
const {Transform, Readable, Writable} = require('stream');

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

describe('CacheToResponse test', function(){
  let transCache, socket;

  before(function(){
    socket = new MySocket({});
  });

  beforeEach(function(){
    transCache = new CacheToResponse(socket);
  });

  it('cacheToResponse is instanceof Transform', function(){
    expect(transCache).to.be.instanceof(Transform);
  });

  it('cacheToResponse have property "getHead"', function(){
    expect(transCache).to.have.property('getHead');
  });

  it('cacheToResponse have property "_transform"', function(){
    expect(transCache).to.have.property('_transform');
  });

  it('cacheToResponse have property "_flush"', function(){
    expect(transCache).to.have.property('_flush');
  });

  it('getHead() test', function(done){
    let head = 'HTTP/1.1 200 OK\r\nServer: JR Server/8.8.8\r\n\r\n';
    let data = 'hello!';
    let read = new Readable({read: function(){
      this.push(head + data);
      this.push(null);
    }});
    let socket = new MySocket({
      writeHead: function(code, head){
        expect(code + JSON.stringify(head)).to.be.equal('200{"Server":"JR Server/8.8.8"}');
        done();
      }
    });
    transCache = new CacheToResponse(socket);
    read.pipe(transCache);
  });

  it('pipe test', function(done){
    let head = 'HTTP/1.1 200 OK\r\nServer: JR Server/8.6.8\r\n\r\n';
    let data = 'If you fail, don\'t foget to learn your lesson.';
    let read = new Readable({read: function(){
      this.push(head + data);
      this.push(null);
    }});
    let socket = new MySocket({
      writeHead: function(code, head){
        this.head = code + JSON.stringify(head);
      },
      write: function(chunk){
        let result = 'H:' + this.head + ',B:' + chunk.toString('utf8');
        expect(result).to.be.equal('H:200{"Server":"JR Server/8.6.8"},B:If you fail, don\'t foget to learn your lesson.');
        done();
      }
    });
    transCache = new CacheToResponse(socket);
    read.pipe(transCache).pipe(socket);
  });

});