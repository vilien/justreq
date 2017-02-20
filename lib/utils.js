'use strict';
const url = require('url');
const fs = require('fs');
var crypto = require('crypto');

function md5(str) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(str);
  str = md5sum.digest('hex');
  return str;
};

// order query
function tidyUrl(sUrl){
  var u = url.parse(sUrl), output = '';
  if (!u.query) return sUrl;
  output += u.pathname + '?';
  output += u.query.split('&').sort().join('&');
  return output;
}

function tidyData(data){
  if (!data) return '';
  return data.split('&').sort().join('&');
}

function randomFileName(length){
  var words = 'abcdefghijklmnopqrstuvwxyz0123456789@#$%&+=', output = '';
  for (let i = 0; i < length; i++) {
    output += words[Math.random() * words.length << 0];
  }
  return output;
}

function fsExistsSync(filepath, mode) {
  try {
    fs.accessSync(filepath, mode || fs.F_OK);
  } catch (e){
    return false;
  }
  return true;
}

/**
 * parse time string, such as '1h', '20m', '120s'
 * @param  {string}  strTime Time string, such as '1h', '20m', '120s'
 * @return {integer}         Integer time
 */
function parseExpires(strTime) {
  var timeMatch = strTime.match(/^(\d+)([hms])?$/);
  var factor = timeMatch[2] === 'h' ? 3600e3 :
    timeMatch[2] === 'm' ? 60e3 : 1e3;
  return timeMatch[1] * factor;
}

module.exports = {
  md5,
  tidyUrl,
  tidyData,
  parseExpires,
  randomFileName,
  fsExistsSync
};
