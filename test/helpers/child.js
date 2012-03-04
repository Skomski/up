var httpServer = require('http').Server()
var up = require('../lib/up')(
    httpServer,
    __dirname + '/child-server',
    { workerPingInterval: '15ms' }
);
