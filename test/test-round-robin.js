var Up = require('..');
var Http = require('http');
var Assert = require('assert');
var request = require('request');

var httpServer = Http.Server().listen(6000, onListen);
var server = Up(
    httpServer,
    __dirname + '/helpers/server',
    { numWorkers: 2, workerTimeout: 0 }
);

testFinished = false;

function onListen (err) {
  if (err) throw err;

  server.on('spawn', function () {
    if (server.workers.length != 2) return;

    request('http://localhost:6000', function (err, res, firstPid) {
      if (err) throw err;

      request('http://localhost:6000', function (err, res, secondPid) {
        if (err) throw err;
        Assert.notEqual(firstPid, secondPid);

        request('http://localhost:6000', function (err, res, pid) {
          if (err) throw err;
          Assert.equal(pid, firstPid)

          request('http://localhost:6000', function (err, res, pid) {
            if (err) throw err;
            Assert.equal(pid, secondPid);
            testFinished = true;
            server.terminate();
          });
        });
      });
    });
  });
}

process.on('exit', function() {
  Assert.ok(testFinished);
});


