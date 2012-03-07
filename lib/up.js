var fork = require('child_process').fork;
var qs = require('querystring');
var os = require('os');
var env = process.env.NODE_ENV;
var Distributor = require('distribute');
var EventEmitter = require('events').EventEmitter;
var debug = require('debug')('up');

module.exports = exports = UpServer;
exports.Worker = Worker;

var cpus = os.cpus().length;

/**
 * UpServer factory/constructor.
 *
 * @param {String} module file
 * @param {Object} options
 * @api public
 */

function UpServer (server, file, options) {
  if (this == global) return new UpServer(server, file, options);

  Distributor.call(this, server);

  options = options || {};

  this.file = file;
  this.numWorkers = options.numWorkers || cpus;

  this.workerTimeout = options.workerTimeout;
  if (this.workerTimeout === undefined) {
    this.workerTimeout = 60 * 1000 * 10;
  }

  this.workerPingInterval = options.workerPingInterval;
  if (this.workerPingInterval === undefined) {
    this.workerPingInterval = 60 * 1000;
  }
  this.workers = [];
  this.spawning = [];
  this.lastIndex = -1;

  this.spawnWorkers(this.numWorkers);
};

UpServer.prototype.__proto__ = Distributor.prototype;

/**
 * Terminate the workers and the server.
 *
 * @param {Function} callback
 * @api public
 */

UpServer.prototype.terminate = function (fn) {
  this.terminated = true;
  var terminates = [].concat(this.workers);

  for (var i = 0, l = terminates.length; i < l; i++) {
    terminates[i].shutdown();
  }

  if (fn) this.server.once('close', fn);
  this.server.close();
};

/**
 * Reloads the workers.
 *
 * @param {Function} callback
 * @api public
 */

UpServer.prototype.reload = function (fn) {
  if (this.reloading) {
    debug('reloading in process - ignoring reload');
    return this;
  }

  // remove all workers in the spawning state
  for (var i = 0, l = this.spawning.length; i < l; i++) {
    this.spawning[i].shutdown();
  }

  // snapshot what workers we'll shut down
  var reload = [].concat(this.workers)
    , self = this

  this.workers = [];

  debug('reloading - spawning %d new workers', this.numWorkers);
  this.spawnWorkers(this.numWorkers);

  this.once('spawn', function (worker) {
    debug('worker %s spawned - removing old workers', worker.pid);
    self.emit('reload');
    fn && fn();

    // shut down old workers
    for (var i = 0, l = reload.length; i < l; i++) {
      reload[i].shutdown();
    }
  });

  return this;
};

/**
 * Helper function to spawn multiple workers.
 *
 * @param {Number} number of workers to spawn
 * @api public
 */

UpServer.prototype.spawnWorkers = function (n) {
  debug('spawning %d workers from master %d', n, process.pid);
  for (var i = 0, l = n; i < l; i++) {
    this.spawnWorker();
  }
};

/**
 * Spawns a worker that binds to an available port.
 *
 * @api public
 */

UpServer.prototype.spawnWorker = function (fn) {
  var w = new Worker(this)
    , self = this

  // keep track that we're spawning
  this.spawning.push(w);

  w.on('stateChange', function () {
    switch (w.readyState) {
      case 'spawned':
        self.spawning.splice(self.spawning.indexOf(w), 1);
        self.workers.push(w);
        self.emit('spawn', w);
        break;

      case 'terminating':
      case 'terminated':
        if (~self.spawning.indexOf(self.spawning.indexOf(w))) {
          self.spawning.splice(self.spawning.indexOf(w), 1);
        }
        if (~self.workers.indexOf(w)) {
          self.workers.splice(self.workers.indexOf(w), 1);
          self.lastIndex = -1;
          if (!self.terminated) self.spawnWorker();
        }
        break;
    }
  });
};

/**
 * Gets the next port in the round.
 *
 * @api private
 */

UpServer.prototype.nextWorker = function () {
  this.lastIndex++;
  if (!this.workers[this.lastIndex]) this.lastIndex = 0;
  return this.workers[this.lastIndex];
};

/**
 * Default HTTP/WS handler (overridden).
 * By default, `up` distributes based on a round robin.
 *
 * @api private
 */

UpServer.prototype.defaultHTTP =
UpServer.prototype.defaultWS = function (req, res, next) {
  if (this.workers.length) {
    next(this.nextWorker().port);
  } else {
    var self = this;
    this.once('spawn', function () {
      next(self.nextWorker().port);
    });
  }
};

function Worker (server) {
  this.server = server;
  this.readyState = 'spawning';

  var opts = JSON.stringify({
      file: server.file
    , requires: server.requires
    , pingInterval: server.workerPingInterval
  });

  this.proc = fork(__dirname + '/worker.js', [opts], { env: process.env });
  this.proc.on('message', this.onMessage.bind(this));
  this.proc.on('exit', this.onExit.bind(this));
  this.pid = this.proc.pid;
  debug('worker %s created', this.pid);
}

Worker.prototype.__proto__ = EventEmitter.prototype;

Worker.prototype.onExit = function () {
  debug('worker %s exited '
    + ('terminating' != this.readyState ? 'unexpectedly': ''), this.pid);
  this.readyState = 'terminated';
  this.emit('stateChange');
};

Worker.prototype.onMessage = function (msg) {
  switch (msg.type) {
    case 'addr':
      // avoid spawns after SIGHUP was sent
      if ('spawning' == this.readyState) {
        debug('worker %s listening on port %s', this.pid, msg.addr.port);
        this.port = msg.addr.port;
        this.readyState = 'spawned';
        this.emit('stateChange');
      }
      break;
  }
};

Worker.prototype.shutdown = function () {
  if ('spawned' == this.readyState) {
    var timeout = this.server.workerTimeout;
    debug('telling worker %s to exit in %dms', this.proc.pid, timeout);
    this.proc.send({ type: 'die', time: timeout });
    this.readyState = 'terminating';
    this.emit('stateChange');
  } else if ('spawning' == this.readyState) {
    debug('killing spawning worker %s', this.pid);
    this.proc.kill('SIGHUP');
    this.readyState = 'terminating';
    this.emit('stateChange');
  }
};
