var options = JSON.parse(process.argv[2]);
var server  = require(options.file);

server.listen(function () {
  process.send({
      type: 'addr'
    , addr: server.address()
  });
});

process.on('message', function (msg) {
  switch (msg.type) {
    case 'die':
      setTimeout(function () {
        process.exit(0);
      }, msg.time);
      break;
  }
});

if (options.pingInterval) {
  setInterval(function(){
    try {
      process.send({ type: 'ping' });
    } catch (err) {
      process.exit(1);
    }
  }, options.pingInterval);
}
