# Up

Zero-downtime reloads built on top of the
[distribute](http://github.com/learnboost/distribute) load balancer.

## Features

- Works with Node 0.6+
- Works at the HTTP request level. It never drops requests or destroys
  `Keep-Alive` sockets while reloading.
- Compatible with any HTTP server.
- Easy-to-use CLI interface for development with automatic reloading
  upon file changes.
- Gracefully handles reloads with syntax errors during development.
- Built on [distribute](http://github.com/learnboost/distribute).

## Setup

Make sure you structure your code so that your `http` server lives in a
separate module that can be `require`d.

**server.js**

```js
module.exports = http.Server(function (req, res) {
  res.writeHead(200);
  res.end('Hello World');
});
```

### JavaScript API

```js
var up = require('up')
  , master = http.Server().listen(3000)

// initialize up
var srv = up(master, __dirname + '/server');

process.on('SIGUSR2', function () {
  srv.reload();
});
```

`require('up')` exports the `UpServer` constructor, which takes three
parameters:

- server (`http.Server`) server to accept connections on
- module (`String`) absolute path to the module.
- options (`Object`)
  - `numWorkers`: (`Number`|`String`): see `--workers` above.
  - `workerTimeout`: (`Number`|`String`): see `--timeout` above.

## Middleware

An `UpServer` inherits from a `Distributor`, which means you can `use()`
any [distribute](http://github.com/learnboost/distribute) middleware.

The main difference is that the "default handler" of up (ie: the last
function in the middleware chain) is the one that executes the
round-robin load balancing.

## Reloading

To reload the workers, call `srv.reload()`. In the example above and CLI,
this is called by sending the `SIGUSR2` signal:

```bash
$ kill -s SIGUSR2 <process id>
```

### Strategy

1. An up server starts with an arbitrary number of workers, which defaults
to the number of CPUs.
2. When a reload instruction is received, it spawns an identical number of
workers.
3. Upon the first of those workers binding to a port, any subsequent
**requests** are sent to that worker, and all the workers containing old
code are discarded.
4. The discarded workers could have been processing requests, so they only
truly die after the configured `workerTimeout`, which defaults to 10
minutes in production. This means that if a user was uploading a file, his
request will be processed without interruptions.
5. As other workers bind and become available, they join the round-robin
round.

## Credits

(The MIT License)

Copyright (c) 2011 Guillermo Rauch &lt;guillermo@learnboost.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
