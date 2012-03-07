var client = require('net').connect(6000, function () {
  client.end(String(process.pid));
});

module.exports = require('http').Server()
