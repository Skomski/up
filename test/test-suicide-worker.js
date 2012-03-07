var Up = require('..');
var Http = require('http');
var Assert = require('assert');
var request = require('request');
var net     = require('net');
var child_process = require('child_process');
var proc;
var testFinished = false;

function onListen (err) {
  proc = child_process.spawn('node', [__dirname + '/helpers/child']);
}

function alive (pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return false;
  }
};


var tcpServer = net.createServer(function (conn) {
  conn.setEncoding('utf8');
  conn.on('data', function (pid) {
    Assert.equal(alive(pid), true);

    proc.kill('SIGHUP');

    setTimeout(function () {
      Assert.equal(alive(pid), false);
      testFinished = true;
    }, 500);
  });
  tcpServer.close();
}).listen(6000, onListen);


process.on('exit', function() {
  Assert.ok(testFinished);
});
