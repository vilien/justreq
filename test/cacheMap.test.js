const CacheMap = require('../lib/cacheMap');
const expect = require('chai').expect;
const crypto = require('crypto');
const fs = require('fs');

function md5(str) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(str);
  str = md5sum.digest('hex');
  return str;
};

describe('CacheMap test', function(){
  let cacheMap, defaultOptions;

  before(function(){
    defaultOptions = {
      'rules': [
        {
          'url': 'user.do\\?id=(\\d+)',
          'subs': 'user.jrs?userId=$1'
        },
        {
          'url': 'config.do\\?id=(\\d+)',
          'subs': 'config-$1.json'
        },
        {
          'url': 'login.do',
          'noCache': true
        },
        {
          'url': 'getGoodsInfo.do',
          'ignoreArgs': 'v,token,timestamp'
        },
        {
          'url': 'getOtherHost.do',
          'host': '202.1.3.5',
          'port': 81,
          'keepFresh': true
        }
      ]
    };
    cacheMap = new CacheMap(defaultOptions);
  });

  it('init() test', function(){
    let rule = [
      {
        'url': 'user.do\\?id=(\\d+)',
        'patt': /user.do\?id=(\d+)/,
        'subs': 'user.jrs?userId=$1',
        'isJrs': true
      },
      {
        'url': 'config.do\\?id=(\\d+)',
        'patt': /config.do\?id=(\d+)/,
        'subs': 'config-$1.json',
        'isJrs': false
      },
      {
        'url': 'login.do',
        'patt': /login.do/,
        'noCache': true,
        'isJrs': false
      },
      {
        'url': 'getGoodsInfo.do',
        'patt': /getGoodsInfo.do/,
        'ignoreArgs': 'v,token,timestamp',
        'isJrs': false
      },
      {
        'url': 'getOtherHost.do',
        'patt': /getOtherHost.do/,
        'host': '202.1.3.5',
        'port': 81,
        'keepFresh': true,
        'isJrs': false
      }
    ];
    expect(cacheMap.rule).to.be.deep.equal(rule);
  });

  it('Properties check', function(){
    expect(cacheMap).to.include.keys('fastMap', 'slowMap', 'fastMapFile', 'slowMapFile');
  });

  describe('match() test', function(){
    it('notfound test', function(){
      expect(cacheMap.match('/aaa')).to.be.deep.equal({notfound: true});
    });

    it('found test', function(){
      let rule = {
        'subs': 'user.jrs?userId=123',
        'isJrs': true,
        'notfound': false
      };
      expect(cacheMap.match('/user.do?id=123')).to.have.deep.include(rule);
    });
  });

  describe('touchSlowMap() test', function(){
    let key, sUrl, data;
    before(function(){
      sUrl = '/newArticle.do?id=56&v=1.0.1&isApp=1';
      data = 'title=[title]&content=[data]';
      key =  md5('POST' + sUrl + data);
    });

    it('new map', function(){
      expect(cacheMap.touchSlowMap('v,isApp', 'POST', sUrl, data, key)).to.be.no;
    });

    it('found map', function(){
      expect(cacheMap.touchSlowMap('v,isApp', 'POST', sUrl, data, key)).to.have
        .include('?id=56').and.include(data).and.include(key);
    });
  });


  describe('check() test', function(){
    it('type = 0', function(){
      expect(cacheMap.check('POST', '/get.do', 'a=1&b=2')).to.be.deep
        .include({type: 0, key: md5('POST/get.doa=1&b=2')})
        .and.have.property('time');
    });

    it('type = 1', function(){
      expect(cacheMap.check('GET', 'user.do?id=123', '')).to.be.deep
        .include({type: 1, subs: 'user.jrs?userId=123'});
    });

    it('type = 2', function(){
      expect(cacheMap.check('GET', 'config.do?id=1001', '')).to.be.deep
        .include({type: 2, subs: 'config-1001.json'});
    });

    it('type = 3', function(){
      expect(cacheMap.check('GET', 'login.do', '')).to.be.deep
        .include({type: 3});
    });

    it('type = 4', function(){
      let key = md5('GET/getInfo.do?a=1&b=2');
      let time = 1486187561701;
      cacheMap.fastMap = {[key]: time};
      expect(cacheMap.check('GET', '/getInfo.do?a=1&b=2', '')).to.be.deep
        .include({type: 4, key: key, time: time});
    });

    it('type = 5', function(){
      let key = md5('GET/getGoodsInfo.do?a=1&v=0.1.1');
      let time = 1486187561701;
      cacheMap.slowMap = {
        'GET/getGoodsInfo.do': [
          [key, time, '?a=1']
        ]
      };
      expect(cacheMap.check('GET', '/getGoodsInfo.do?v=0.1.1&a=1', '')).to.be.deep
        .include({type: 5, key: key, time: time});
    });

    it('type = 6', function(){
      let key = md5('GET/getGoodsInfo.do?v=0.1.2&a=2');
      expect(cacheMap.check('GET', '/getGoodsInfo.do?v=0.1.2&a=2', '')).to.be.deep
        .include({type: 6, key: key})
        .and.have.property('time');
    });

    it('type = 7', function(){
      let key = md5('GET/getOtherHost.do?v=0.1.2&a=2');
      expect(cacheMap.check('GET', '/getOtherHost.do?v=0.1.2&a=2', '')).to.be.deep
        .include({type: 7, key: key, host: '202.1.3.5', port: 81})
        .and.have.property('time');
    });
  });

  describe('recheck() test', function(){
    it('type = 0', function(){
      let key = md5('GET/getInfo.do?a=1&b=2');
      let time = 1486187561701;
      let cacheType = {type: 0, key: 'no_exists_key', time};
      cacheMap.fastMap = {[key]: time};
      cacheMap.recheck(cacheType);
      expect(cacheType).to.be.deep.include({type: 0, time});
    });

    it('type = 4', function(){
      let key = md5('GET/getInfo.do?a=1&b=2');
      let time = 1486187561701;
      let cacheType = {type: 0, key, time};
      cacheMap.fastMap = {[key]: time};
      cacheMap.recheck(cacheType);
      expect(cacheType).to.be.deep.equal({type: 4, key, time});
    });
  });

  describe('updateMap() test', function(){
    let tmpPath = './tmp',
      fastMapFile = tmpPath + '/fast-map.json',
      slowMapFile = tmpPath + '/slow-map.json',
      key = '51e9e916c68a2be87fe514a02e952570',
      time = +new Date;

    before(function(){
      try {
        fs.accessSync(tmpPath, fs.F_OK);
      } catch (e){
        fs.mkdirSync(tmpPath);
      }
      cacheMap.fastMapFile = fastMapFile;
      cacheMap.slowMapFile = slowMapFile;
      cacheMap.fastMap = {[key]: 1484206014846 };
      cacheMap.slowMap = {'GET/test.do': [[key, 1487925573082, '?a=1']]};
    });

    after(function(){
      fs.unlinkSync(fastMapFile);
      fs.unlinkSync(slowMapFile);
    });

    it('update fastMap', function(done){
      let data;
      cacheMap.updateMap(key);
      setTimeout(function(){
        data = fs.readFileSync(cacheMap.fastMapFile, {encoding: 'utf8'});
        expect((JSON.parse(data))[key]).to.be.above(time);
        done();
      }, 5);
    });

    it('update slowMap', function(done){
      let data;
      cacheMap.updateMap(key, true);
      setTimeout(function(){
        data = fs.readFileSync(cacheMap.slowMapFile, {encoding: 'utf8'});
        expect((JSON.parse(data))['GET/test.do'][0][1]).to.be.above(time);
        done();
      }, 5);
    });

  });
});