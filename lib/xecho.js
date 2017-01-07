const colors = require('colors');

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

const xecho = function(msg, type) {
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
  try {
    console.log(msg[type]);
  } catch (err) {
    console.log(msg);
  }
}

module.exports = xecho;