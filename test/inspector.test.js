const inspector = require('../lib/inspector');
const expect = require('chai').expect;
const fs = require('fs');

describe('inspector test', function(){
  let cacheType, file, tmpPath = './tmp', options,
      originKey = 'e0e39d220ff38421b6dd61a998975b28';

  before(function(){
    try {
      fs.accessSync(tmpPath, fs.F_OK);
    } catch (e){
      fs.mkdirSync(tmpPath);
    }
  });

  beforeEach(function(){
    file =  tmpPath + '/insp-' + (+new Date) + '.js';
    cacheType = {type: 6, key: originKey, time: 0};
    options = {'inspector': file};
  });

  afterEach(function(){
    try {
      fs.unlinkSync(file);
    } catch (err) {}
  });

  it('type 0, should be cached', function(done){
    let req = {url: 'getInfo.do?data=dXNlcklkPTEwMDE='};
    let chunk = null;
    let code = 'module.exports = function(req, buf){ \
        return {needCache: true, cacheId: "a2098fd10e676ffe697ec3169f2e49e6"}; \
      }';
    fs.writeFileSync(file, code);
    setTimeout(function(){
      inspector(cacheType, options, req, chunk);
      expect(cacheType).to.be.deep.include({type: 0, key: 'a2098fd10e676ffe697ec3169f2e49e6'});
      done();
    }, 5);
  });

  it('type 1, should not be change (jrs)', function(done){
    let req = {url: 'getInfo.do?data=dXNlcklkPTEwMDE='};
    let code = 'module.exports = function(req, buf){ \
        return {needCache: true, cacheId: "a2098fd10e676ffe697ec3169f2e49e6"}; \
      }';
    fs.writeFileSync(file, code);
    cacheType.type = 1;
    setTimeout(function(){
      inspector(cacheType, options, req);
      expect(cacheType).to.be.deep.include({type: 1, key: originKey});
      done();
    }, 5);
  });

  it('type 2, should not be change (subs)', function(done){
    let req = {url: 'getInfo.do?data=dXNlcklkPTEwMDE='};
    let code = 'module.exports = function(req, buf){ \
        return {needCache: true, cacheId: "a2098fd10e676ffe697ec3169f2e49e6"}; \
      }';
    fs.writeFileSync(file, code);
    cacheType.type = 2;
    setTimeout(function(){
      inspector(cacheType, options, req);
      expect(cacheType).to.be.deep.include({type: 2, key: originKey});
      done();
    }, 5);
  });

  it('type 3, not allow cache', function(done){
    let req = {url: 'getInfo.do?data=dXNlcklkPTEwMDE='};
    let chunk = null;
    let code = 'module.exports = function(req, buf){return {needCache: false};}';
    fs.writeFileSync(file, code);
    setTimeout(function(){
      inspector(cacheType, options, req, chunk);
      expect(cacheType.type).to.be.equal(3);
      done();
    }, 5);
  });

  it('type 4, should not be change (auto)', function(done){
    let req = {url: 'getInfo.do?data=dXNlcklkPTEwMDE='};
    let chunk = null;
    let code = 'module.exports = function(req, buf){ \
        return {needCache: true, cacheId: "a2098fd10e676ffe697ec3169f2e49e6"}; \
      }';
    cacheType.type = 4;
    fs.writeFileSync(file, code);
    setTimeout(function(){
      inspector(cacheType, options, req, chunk);
      expect(cacheType).to.be.deep.include({type: 4, key: originKey});
      done();
    }, 5);
  });

  it('type 6, wrong cacheId', function(done){
    let req = {url: 'getInfo.do?data=dXNlcklkPTEwMDE='};
    let code = 'module.exports = function(req, buf){ \
        return {needCache: true, cacheId: "wrong_cacheId"}; \
      }';
    fs.writeFileSync(file, code);
    setTimeout(function(){
      inspector(cacheType, options, req);
      expect(cacheType).to.be.deep.include({type: 6, key: originKey});
      done();
    }, 5);
  });

});