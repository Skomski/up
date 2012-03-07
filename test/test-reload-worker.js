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

var reloadFired  = false;
var testFinished = false;

function onListen (err) {
  if (err) throw err;
  server.on('spawn', onSpawn);

  function onSpawn () {
    if (2 === server.workers.length) {
      server.removeListener('spawn', onSpawn);
    } else {
      return;
    }
    request('http://localhost:6000', function (err, res, firstPid) {
      request('http://localhost:6000', function (err, res, secondPid) {
        Assert.notEqual(firstPid, secondPid);
        server.once('reload', function () {
          reloadFired = true;
        });
        server.reload(function () {
          server.once('spawn', function () {
            request('http://localhost:6000', function (req, res, pid) {
              Assert.notEqual(firstPid, pid);
              request('http://localhost:6000', function (req, res, pid) {
                Assert.notEqual(pid, firstPid);
                Assert.notEqual(pid, secondPid);
                Assert.ok(reloadFired);
                testFinished = true;
                server.terminate();
              });
            });
          });
        });
      });
    });
  }
}

process.on('exit', function() {
  Assert.ok(testFinished);
});
