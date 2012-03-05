var up = require('../lib/up')
  , net = require('net')
  , http = require('http')
  , expect = require('expect.js')
  , request = require('superagent')
  , child_process = require('child_process')
  , Distributor = require('distribute')

describe('up', function () {

  it('should reload workers', function (done) {
    var httpServer = http.Server().listen(6002, onListen)
      , srv = up(httpServer, __dirname + '/server', { numWorkers: 2 })
      , reloadFired = false

    function onListen (err) {
      if (err) return done(err);

      srv.on('spawn', onSpawn);

      function onSpawn () {
        // count workers
        if (2 == srv.workers.length) {
          // prevent race conditions with reload spawn events
          srv.removeListener('spawn', onSpawn);
        } else {
          return;
        }

        request.get('http://localhost:6002', function (res) {
          var pid1 = res.body.pid;
          expect(pid1).to.be.a('number');

          request.get('http://localhost:6002', function (res) {
            var pid2 = res.body.pid;
            expect(pid2).to.be.a('number');
            expect(pid2).to.not.equal(pid1);

            srv.once('reload', function () {
              reloadFired = true;
            });

            srv.reload(function () {
              // callback fires upon 1 spawning, so we set up another
              // listener for the remaining worker

              srv.once('spawn', function () {
                request.get('http://localhost:6002', function (res) {
                  expect(res.body.pid).to.not.equal(pid1);
                  pid1 = res.body.pid;

                  request.get('http://localhost:6002', function (res) {
                    expect(res.body.pid).to.not.equal(pid1);
                    expect(res.body.pid).to.not.equal(pid2);
                    expect(reloadFired).to.be(true);
                    done();
                  });
                });
              });
            });
          });
        });
      }
    }
  });

  it('should suicide workers if master dies', function (done) {
    // utility to check whether a pid is alive
    // https://raw.github.com/visionmedia/monit.js/master/lib/utils.js
    function alive (pid) {
      try {
        process.kill(pid, 0);
        return true;
      } catch (err) {
        return false;
      }
    };

    var proc;

    // the spawn process will start an up server with 1 worker and
    // will send us the pid over a net channel
    net.createServer(function (conn) {
      conn.setEncoding('utf8');
      conn.on('data', function (pid) {
        expect(alive(pid)).to.be(true);

        // kill master
        proc.kill('SIGHUP');

        // since the ping interval is set to 15ms, we try in 30
        setTimeout(function () {
          expect(alive(pid)).to.be(false);
          console.log(pid)
          done();
        }, 30);
      });
    }).listen(6003, onListen);

    function onListen () {
      // create a child process (master) we'll kill later
      proc = child_process.spawn('node', [__dirname + '/child.js']);
    }
  });

});
