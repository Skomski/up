var express = require('express')
var app = express.createServer();

app.get('/', function (req, res) {
  res.json(process.pid);
});

module.exports = app;
