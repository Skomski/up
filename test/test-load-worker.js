var Up = require('..');
var Http = require('http');
var Assert = require('assert');
var request = require('request');

var httpServer = Http.Server().listen(6000, onListen);
var server = Up(
    httpServer,
    __dirname + '/helpers/server',
    { numWorkers: 1, workerTimeout: 0 }
);

testFinished = false;

function onListen (err) {
  if (err) throw err;
  request('http://localhost:6000', function (err, res, body) {
    Assert.ok(body);
    testFinished = true;
    server.terminate();
  });
}

process.on('exit', function() {
  Assert.ok(testFinished);
});
