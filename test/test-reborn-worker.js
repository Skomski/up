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

function getStatus (cb) {
  request('http://localhost:6000', function (err, res, body) {
    if (err) throw err;
    cb(body);
  });
}

function onListen (err) {
  if (err) throw err;

  getStatus(function(oldPid) {
    process.kill(oldPid);

    setTimeout(function(){
      getStatus(function(newPid) {
        Assert.notEqual(newPid, oldPid);
        testFinished = true;
        server.terminate();
      });
    }, 1);
  });
}

process.on('exit', function() {
  Assert.ok(testFinished);
});
