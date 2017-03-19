'use strict';

const url = require('url');
const fs = require('fs');
const path = require('path');
const {md5,fsExistsSync} = require('./utils');
const xecho = require('./xecho');

const cwd = process.cwd();

class CacheMap {
  constructor(options) {
    this.fastMapFile = path.resolve(cwd, '.jr/fast-map.json');
    this.slowMapFile = path.resolve(cwd, '.jr/slow-map.json');
    if (fsExistsSync(this.fastMapFile, fs.R_OK) && !options.clean) {
      this.fastMap = JSON.parse(fs.readFileSync(this.fastMapFile));
    } else {
      this.fastMap = {};
    }
    if (fsExistsSync(this.slowMapFile, fs.R_OK) && !options.clean) {
      this.slowMap = JSON.parse(fs.readFileSync(this.slowMapFile));
    } else {
      this.slowMap = {};
    }
    this._init(options.rules);
  }

  _init(rules) {
    let pJrs = /\.jrs(?:[^\/\\]*)$/;
    this.rule = rules.map((item)=>{
      if (item.href instanceof RegExp) {
        item.patt = item.href;
      } else {
        try {
          item.patt = new RegExp(item.href);
          item.isJrs = pJrs.test(item.subs);
        } catch (err) {
          xecho('Invalid rule: href = ' + item.href, 'error', true);
        }
      }
      return item;
    });
  }

  /**
   * Check cache type
   * @param  {string} method      "GET", "POST" and so on.
   * @param  {string} sUrl        Request url, without host.
   * @param  {string} reducedData Reduced request body, without header.
   */
  check(method, sUrl, reducedData) {
    let output = {}, rule = this.match(sUrl), key = md5(method + sUrl + reducedData), slow;
    if (rule.isJrs) {
      output.type = 1; // JRScript substitution
      output.subs = rule.subs;
    } else if (rule.subs) {
      output.type = 2; // Normal substitution
      output.subs = rule.subs;
    } else if (rule.noCache) {
      output.type = 3; // Not allow cache
    } else if (rule.keepFresh) {
      output.type = 7; // keep fresh
      output.key = key;
      output.time = +new Date();
    } else if (this.fastMap[key]) {
      output.type = 4; // in fastmap
      output.key = key;
      output.time = this.fastMap[key];
    } else if (!rule.notfound) {
      if (slow = this.touchSlowMap(rule.ignoreArgs, method, sUrl, reducedData, key)) {
        output.type = 5; // in slowmap
        output.key = slow[0];
        output.time = slow[1];
      } else {
        output.type = 6; // Need proxy, cache to slowmap & fastmap
        output.key = key;
        output.time = +new Date();
      }
    } else {
      output.type = 0; // Need proxy, cache to fastmap
      output.key = key;
      output.time = +new Date();
    }
    if (rule.host) output.host = rule.host;
    if (rule.port) output.port = rule.port;
    return output;
  }

  // Recheck cacheType it be modify by inspector
  recheck(cacheType) {
    let key = cacheType.key;
    if (this.fastMap[key]) {
      cacheType.type = 4;
      cacheType.time = this.fastMap[key];
    }
  }

  /**
   * Update map both fastmap and slowmap
   * @param  {string} key         Value of md5(method + sUrl + buf.toString())
   * @param  {[type]} markSlowmap Should update slowmap
   */
  updateMap(key, markSlowmap) {
    let time = +new Date();
    this.fastMap[key] = time;
    if (markSlowmap) {
      for (let k in this.slowMap) {
        this.slowMap[k] = this.slowMap[k].map(function(map){
          if (map[0] === key) {
            map[1] = time;
          }
          return map;
        });
      }
    }
    fs.writeFile(this.fastMapFile, JSON.stringify(this.fastMap, null, 2));
    fs.writeFile(this.slowMapFile, JSON.stringify(this.slowMap, null, 2));
  }

  /**
   * match the rule
   * @param  {string} sUrl Request url, without host.
   * @return {object}      Matched rule, default {}
   */
  match(sUrl) {
    let rule = {notfound: true}, mat;
    this.rule.map((item)=>{
      if (mat = sUrl.match(item.patt)) {
        Object.assign(rule, {notfound: false}, item);
        if (mat.length > 1 && rule.subs) { // Support for RegExp replacement
          rule.subs = rule.subs.replace(/\$(\d)/g, function(a, m){
            return mat[m] ? mat[m] : a;
          });
        }
      }
    });
    return rule;
  }

  /**
   * Search map of slowmap. If there isn't it, create it.
   * @param  {string} ignore      Arguments can be ignored
   * @param  {string} method      "GET", "POST" and so on.
   * @param  {string} sUrl        Request url, without host.
   * @param  {object} reducedData Request body, without header.
   * @param  {string} key         Value of md5(method + sUrl + buf.toString())
   * @return {Array}              map, default 'undefined'
   */

  touchSlowMap(ignore, method, sUrl, reducedData, key) {
    let output, u = url.parse(sUrl), caches = this.slowMap[method + u.pathname] || [],
      igs = (ignore || '').split(','), search = (u.search || '').replace(/^\?/, '&'), data = reducedData.toString();
    try {
      igs.map(function(ig){
        if (ig) {
          let patt = new RegExp('&?' + ig + '=[^&]*');
          search = search.replace(patt, '');
          data = data.replace(patt, '');
        }
      });
    } catch (err) {
      xecho(err, 'error', true);
    }
    search = search ? search.replace(/^&/, '?') : '';
    caches.map(function(item){
      if (item[2] == search) {
        if (item[3] || data) {
          if (item[3] == data) {
            output = item;
          }
        } else {
          output = item;
        }
      }
    });
    if (!output) { // create map
      let cMap = [key, +new Date(), search];
      if (data) cMap.push(data, 0);
      this.slowMap[method + u.pathname] = this.slowMap[method + u.pathname] || [];
      this.slowMap[method + u.pathname].push(cMap);
    }
    return output;
  }

}

module.exports = CacheMap;
