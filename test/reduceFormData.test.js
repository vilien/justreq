const RFD = require('../lib/reduceFormData');
const expect = require('chai').expect;

describe('reduceFormData test', function(){
  it('reduce() test, data.length >= 17', function(){
    expect(RFD.prototype.reduce('Node.js® is a JavaScript runtime built on Chrome\'s V8 JavaScript engine.')).to.be
      .equal('~6f9b4b22d09ddac4d'); // '~' + latter half of md5
  });

  it('reduce() test, data.length < 17', function(){
    expect(RFD.prototype.reduce('1234567890abcdef')).to.be
      .equal('1234567890abcdef');
  });

  it('feed normal formdata', function(){
    let data = 'userName=Lucy&age=19&sex=female&bio=I\'m Lucy. I like swimming and running.';
    let rfd = new RFD({}, {'content-length': data.length});
    rfd.feed(data);
    expect(rfd.toString()).to.be.equal('userName=Lucy&age=19&sex=female&bio=~36e9a8864ac6221d8');
  });

  it('feed multipart formdata', function(){
    let data = '--AaB030x\r\n';
    data += 'Content-Disposition: form-data; name="title"\r\n\r\n';
    data += 'This is a text file.';
    data += '--AaB030x\r\n';
    data += 'Content-Disposition: form-data; name="file"; filename="file1.txt"\r\n';
    data += 'Content-Type: text/plain; charset=UTF-8\r\n\r\n';
    data += 'hello world!\r\n';
    data += '--AaB030x--';
    let buf = Buffer.from(data, 'utf8');
    let rfd = new RFD({}, {
      'content-length': buf.length,
      'content-type': 'multipart/form-data; boundary=AaB030x'
    });
    rfd.feed(buf);
    expect(rfd.toString()).to.be.equal('title=~d16c839d947811ee8&file=aGVsbG8gd29ybGQh'); // base64
  });
});