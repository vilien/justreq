const utils = require('../lib/utils');
const expect = require('chai').expect;

describe('md5 test', function(){
  it('md5("123") eq "202cb962ac59075b964b07152d234b70"', function(){
    expect(utils.md5('123')).to.be.equal('202cb962ac59075b964b07152d234b70');
  });
  it('md5("!@#$%^&*()") eq "05b28d17a7b6e7024b6e5d8cc43a8bf7"', function(){
    expect(utils.md5('!@#$%^&*()')).to.be.equal('05b28d17a7b6e7024b6e5d8cc43a8bf7');
  });
});

describe('tidyUrl test', function(){
  it('tidyUrl("index.do?c=3&a=1&b=2")', function(){
    expect(utils.tidyUrl('index.do?c=3&a=1&b=2')).to.be.equal('index.do?a=1&b=2&c=3');
  });
  it('tidyUrl("/?name=zhang&age=21&sex=male")', function(){
    expect(utils.tidyUrl('/?name=zhang&age=21&sex=male'))
      .to.be.equal('/?age=21&name=zhang&sex=male');
  });
});

describe('tidyData test', function(){
  it('tidyData("b=2&c=3&a=1")', function(){
    expect(utils.tidyData('b=2&c=3&a=1')).to.be.equal('a=1&b=2&c=3');
  });
});

describe('parseExpires test', function(){
  it('parseExpires("10s")', function(){
    expect(utils.parseExpires('10s')).to.be.equal(10000);
  });
  it('parseExpires("8m")', function(){
    expect(utils.parseExpires('8m')).to.be.equal(8 * 60e3);
  });
  it('parseExpires("15h")', function(){
    expect(utils.parseExpires('15h')).to.be.equal(15 * 3600e3);
  });
});

describe('randomFileName test', function(){
  it('randomFileName(11)', function(){
    expect(utils.randomFileName(11)).to.match(/^[abcdefghijklmnopqrstuvwxyz0123456789@#$%&+=]{11}$/);
  });
});

describe('fsExistsSync test', function(){
  it('fsExistsSync("./utils.test.js")', function(){
    let result = utils.fsExistsSync(process.cwd() + '/package.json');
    expect(result).to.be.ok;
  });
});