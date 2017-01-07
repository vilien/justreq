const fs = require('fs');
const mimetype = require('./mimetype');
const httpCode = require('./httpCode');
const CRLF = '\r\n';

const Html = function() {
  this.htmlPath = __dirname + '/../html/';

};

Html.prototype.init = function(options) {
  this.version = options.version;
};

Html.prototype.send404 = function(file) {
  let data = fs.readFileSync(this.htmlPath + '404.html');
  let body = this.packBody(data, {version : this.version, file});
  let head = this.packHead(404, body.length, mimetype['html']);
  return head + body;
};

Html.prototype.send500 = function(errMsg) {
  let data = fs.readFileSync(this.htmlPath + '500.html');
  let body = this.packBody(data, {version : this.version, errMsg});
  let head = this.packHead(500, body.length, mimetype['html']);
  return head + body;
};

Html.prototype.packHead = function(code, length, mime, extraHead) {
  let readonlyHeads = ['Server', 'Date', 'Content-Length'], head = '';
  head += 'HTTP/1.1 ' + httpCode[code] + CRLF;
  head += 'Server: JR Server/' + this.version + CRLF;
  head += 'Date: ' + (new Date().toGMTString()) + CRLF;
  extraHead = this.tidyHeadTitle(extraHead || {});
  for (let k in extraHead) {
    if (readonlyHeads.indexOf(k)===-1) {
      head += k + ': ' + extraHead[k] + CRLF;
    }
  }
  head += extraHead['Content-Type'] ? '' : 'Content-Type: ' + mime + CRLF;
  head += 'Content-Length: ' + length + CRLF;
  head += extraHead['Connection'] ? '' : 'Connection: keep-alive' + CRLF;
  head += CRLF;
  return head;
};

// Put the first letters of headertitle to uppercase
Html.prototype.tidyHeadTitle = function(head) {
  let output = {}, patt = /\b[a-z]/g;
  for (let k in head) {
    let key = k.replace(patt, s => s.toUpperCase());
    output[key] = head[k];
  }
  return output;
};

Html.prototype.packBody = function(data, variate) {
  return (data || '').toString().replace(/\{\{(\w+)\}\}/g, function(a, b) {
    return variate[b];
  });
};

Html.prototype.checkMime = function(filename) {
  filename = filename === '/' ? 'index.html' : filename;
  return mimetype[filename.replace(/^.*\./, '')] || 'text/plain';
};

module.exports = new Html;