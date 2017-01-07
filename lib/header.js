'use strict';

const CRLF = '\r\n';

const Header = function(str){
  this.string = str;
};

Header.prototype.toJson = function(){
  let arr = this.string.split(CRLF), output = {};
  let fl = arr[0].split(/\s+/);
  output.method = fl[0];
  output.url = fl[1];
  output.protocol = fl[2];
  for (let i=1; i<arr.length; i++) {
    let idx = arr[i].indexOf(':');
    let key = arr[i].substring(0, idx).toLowerCase();
    output[key] = arr[i].substring(idx+1).replace(/^\s/, '');
  }
  return output;
};

Header.prototype.toString = function(){
  return this.string;
};

Header.prototype.setHeader = function(hName, hValue){
  let arr = this.string.split(CRLF), output = '', replaced = false;
  hName = hName.toLowerCase();
  output += arr[0] + CRLF;
  for (let i=1; i<arr.length; i++) {
    let idx = arr[i].indexOf(':');
    let key = arr[i].substring(0, idx);
    if (hName===key.toLowerCase()) {
      replaced = true;
      output += this.upperInitial(key) + ': ' + hValue + CRLF;
    } else {
      output += arr[i] + CRLF;
    }
  }
  if (!replaced) {
    output += hName + ': ' + hValue;
  }
  this.string = output;
};

Header.prototype.delHeader = function(hName){
  let arr = this.string.split(CRLF), output = '';
  hName = hName.toLowerCase();
  output += arr[0] + CRLF;
  for (let i=1; i<arr.length; i++) {
    let idx = arr[i].indexOf(':');
    let key = arr[i].substring(0, idx);
    if (hName!==key.toLowerCase()) {
      output += arr[i] + CRLF;
    }
  }
  this.string = output;
};

Header.prototype.upperInitial = function(hName){
  let patt = /\b[a-z]/g;
  return hName.replace(patt, s => s.toUpperCase());
};

module.exports = Header;
