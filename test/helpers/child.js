var httpServer = require('http').Server()
var up = require('../..')(
    httpServer,
    __dirname + '/child-server',
    { workerPingInterval: 10, numWorkers: 2 }
);
