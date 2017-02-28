const Cache = require('../lib/cache');
const expect = require('chai').expect;
const fs = require('fs');
const {Transform, Readable, Writable} = require('stream');

describe('Cache test', function(){
  let cache, file, tmpPath = './tmp';

  before(function(){
    try {
      fs.accessSync(tmpPath, fs.F_OK);
    } catch (e){
      fs.mkdirSync(tmpPath);
    }
  });

  beforeEach(function(){
    file =  tmpPath + '/cache' + (+new Date) + '.tmp';
    cache = new Cache(file);
  });

  afterEach(function(){
    cache.end();
    fs.unlinkSync(file);
  });

  it('cache is instanceof Transform', function(){
    expect(cache).to.be.instanceof(Transform);
  });

  it('cache have property "writeHead"', function(){
    expect(cache).to.have.property('writeHead');
  });

  it('cache have property "_transform"', function(){
    expect(cache).to.have.property('_transform');
  });

  it('cache have property "_flush"', function(){
    expect(cache).to.have.property('_flush');
  });

  it('cache.writeHead test', function(done){
    let head = 'HTTP/1.1 200 OK\r\nServer: JRServer\r\n\r\n';
    cache.writeHead('1.1', 200, {'Server': 'JRServer'});
    fs.readFile(file, {encoding: 'utf8'}, function(err, data){
      expect(data).to.be.equal(head);
      done();
    });
  });

  it('cache.pipe() test', function(done){
    let read = new Readable({read: function(){
      this.push('All the bright precious things fade so fast.');
      this.push(null);
    }});
    let write = new Writable({write: function(chunk){
      expect(chunk.toString('utf8')).to.be.equal('All the bright precious things fade so fast.');
      done();
    }});
    read.pipe(cache).pipe(write);
  });

  it('pipe(cache) test', function(done){
    let head = 'HTTP/1.1 200 OK\r\nServer: JRServer\r\n\r\n';
    let read = new Readable({read: function(){
      this.push('Time you enjoy wasting, was not wasted.');
      this.push(null);
    }});
    cache.writeHead('1.1', 200, {'Server': 'JRServer'});
    read.pipe(cache);
    cache.on('finish', function(){
      setTimeout(function(){
        fs.readFile(file, {encoding: 'utf8'}, function(err, data){
          expect(data).to.be.equal(head + 'Time you enjoy wasting, was not wasted.');
          done();
        });
      }, 5);
    });
  });
});