'use strict';

const colors = require('colors');
const fecha = require('fecha');

colors.setTheme({  
  silly: 'rainbow',
  input: 'grey',
  verbose: 'cyan',
  prompt: 'red',
  info: 'green',
  data: 'blue',
  help: 'cyan',
  warn: 'yellow',
  debug: 'magenta',
  error: 'red',
  proxy: 'cyan',
  cache: 'green',
  jrs: 'magenta',
  subs: 'yellow',
});

const xecho = function(msg, type, showTime) {
  let time = fecha.format(new Date(), '[[]HH:mm:ss[]]'), msgs = [];
  type = type || 'info';
  if (typeof msg !== 'string') {
    try {
      msg = JSON.stringify(msg);
    } catch (err) {
      try {
        msg = msg.toString();
      } catch (err) {}
    }
  }
  msg = showTime ? time + msg : msg;
  if ((type === 'jrs' || type === 'subs') && (msgs = msg.split('->')) && msgs.length > 1) {
    console.log.call(null, (msgs[0])['blue'], '->'['white'], (msgs[1])[type]);
  } else {
    console.log(msg[type]);
  }
};

module.exports = xecho;