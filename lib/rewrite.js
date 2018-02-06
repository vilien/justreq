'use strict';

function rewrite(req, rules = []) {
  let newUrl = req.url;
  rules.filter(it => it.rewrite).some((item)=>{
    if (item.method && item.method.toLowerCase() !== req.method.toLowerCase()) {
      return;
    }
    if (item.patt.test(req.url)) {
      newUrl = req.url.replace(item.patt, item.rewrite);
    }
  });
  return newUrl;
}

module.exports = rewrite;
