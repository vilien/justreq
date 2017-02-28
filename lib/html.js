const fs = require('fs');
const mimetype = require('./mimetype');
const httpCode = require('./httpCode');
const CRLF = '\r\n';

class Html{
  constructor(){
    this.htmlPath = __dirname + '/../html/';
  }

  init(options) {
    this.version = options.version;
    this.publicHead = {
      'Server': 'JR Server/' + options.version,
      'Content-Type': 'text/html'
    };
    options.onCors ? this.publicHead['Access-Control-Allow-Origin'] = '*' : 0;
  }

  send400(socket, errMsg) {
    let data = fs.readFileSync(this.htmlPath + '400.html');
    let body = this.packBody(data, {version: this.version, errMsg});
    socket.writeHead(400, this.publicHead);
    socket.end(body);
  }

  send404(socket, path) {
    let data = fs.readFileSync(this.htmlPath + '404.html');
    let body = this.packBody(data, {version: this.version, path});
    socket.writeHead(404, this.publicHead);
    socket.end(body);
  }

  send500(socket, errMsg) {
    let data = fs.readFileSync(this.htmlPath + '500.html');
    let body = this.packBody(data, {version: this.version, errMsg});
    socket.writeHead(500, this.publicHead);
    socket.end(body);
  }

  packHead(code, mime, extraHead) {
    let readonlyHeads = ['Server', 'Date', 'Content-Length'], head = '';
    head += 'HTTP/1.1 ' + httpCode[code] + CRLF;
    head += 'Server: JR Server/' + this.version + CRLF;
    head += 'Date: ' + (new Date().toGMTString()) + CRLF;
    extraHead = this.tidyHeadTitle(extraHead || {});
    for (let k in extraHead) {
      if (readonlyHeads.indexOf(k) === -1) {
        head += k + ': ' + extraHead[k] + CRLF;
      }
    }
    head += extraHead['Content-Type'] ? '' : 'Content-Type: ' + mime + CRLF;
    head += extraHead['Connection'] ? '' : 'Connection: keep-alive' + CRLF;
    head += CRLF;
    return head;
  }

  // Put the first letters of headertitle to uppercase
  tidyHeadTitle(head) {
    let output = {}, patt = /\b[a-z]/g;
    for (let k in head) {
      let key = k.replace(patt, s => s.toUpperCase());
      output[key] = head[k];
    }
    return output;
  }

  packBody(template, variate) {
    return (template || '').toString().replace(/\{\{(\w+)\}\}/g, function(a, b) {
      return variate[b];
    });
  }

  checkMime(filename) {
    filename = filename === '/' ? 'index.html' : filename;
    return mimetype[filename.replace(/^.*\./, '')] || 'text/plain';
  }
}

module.exports = new Html;
