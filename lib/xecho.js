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
    jrs: 'magenta'
});

const xecho = function(msg, type, showTime) {
  let time = fecha.format(new Date(), '[[]HH:mm:ss[]]');
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
  try {
    console.log(msg[type]);
  } catch (err) {
    console.log(msg);
  }
};

module.exports = xecho;