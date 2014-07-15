/**
 * Created by Theadd on 6/5/14.
 */

exports.Task = Task

var fs = require('fs')
var http = require('http')
var url = require('url')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var requestify = require('requestify')
var TorrentUtils = require('./lib/TorrentUtils')
var readTorrent = require('read-torrent')
var NodeCache = require('node-cache')
Task.prototype.requestsCache = null

inherits(Task, EventEmitter)

function Task (target, interval) {
  var self = this
  EventEmitter.call(self)
  self._target = target
  self._intervalMs = interval
  self._useCache = false
  self.setStatus('initialized')
}

Task.prototype.setStatus = function (state) {
  var self = this
  self.status = state || 'undefined'
  self.emit('status', self.status)
}

Task.prototype.start = function () {
  var self = this
  if (self.status == 'standby' || self.status == 'initialized' || self.status == 'stopped') {
    self.setStatus('standby')

    if (typeof self._target != 'string') {
      self._target()
    } else {
      self.url = self._target
      self._get()
    }
  } else {
    //console.log("Avoid overlapping task from status: " + self.status)
  }
  if (!self._interval) {
    self.setInterval(self._intervalMs)
  }
}

Task.prototype.stop = function () {
  var self = this
  self.setStatus('stopped')

  self.setInterval(0)
}

Task.prototype.use = function (_url) {
  var self = this
  self.url = _url || self.url
  self._get()
}

Task.prototype.setInterval = function (intervalMs) {
  var self = this
  if (self._interval) {
    clearInterval(self._interval)
  }

  self._intervalMs = intervalMs
  if (self._intervalMs) {
    self._interval = setInterval(self.start.bind(self), self._intervalMs)
  }
}

Task.prototype._get = function () {
  var self = this
  self.setStatus('downloading')

  if (self.url.substr(-3) == '.gz') {
    self._getFile()
  } else if (self.url.substr(-8) == '.torrent') {
    self._getTorrent()
  } else {
    self._getContent()
  }
}

Task.prototype._getFile = function () {
  var fs = require('fs')
  var tmp = require('tmp')
  var sys = require('sys')
  var exec = require('child_process').exec

  var self = this,
    url_host = url.parse(self.url).host,
    port_match = url_host.match(/:([0-9]+)/),
    url_port = (port_match) ? port_match[1] : 80

  url_host = (port_match) ? url_host.replace(/:[0-9]+/, '') : url_host

  var options = {
    host: url_host,
    port: url_port,
    path: url.parse(self.url).pathname
  }

  http.get(options, function(res) {
    tmp.file({ prefix: 'task-', postfix: '.gz' }, function _tempFileCreated(err, path, fd) {
      if (err) {
        self._error(err)
      } else {
        var file = fs.createWriteStream(path)
        res.on('data', function(chunk) {
          file.write(chunk)

        }).on('end', function() {
            file.end()
            self.setStatus('downloaded')
            var child = exec('gunzip ' + path, function (error, stdout, stderr) {
              if (error != null) {
                self._error(error)
              } else {
                self.setStatus('decompressed')
                self._streamLocalFile(path.substr(0, path.length - 3))
              }
            })
          })
      }
    })
  }).on('error', function(err) {
      self._error(err)
    })
}

Task.prototype._getContent = function () {
  var self = this,
    cached = (self._useCache) ? self.requestsCache.get(self.url) : {}

  if (typeof cached[self.url] === "undefined") {
    requestify.get(self.url).then(function(response) {
      response.getBody()
      self.emit('data', response.body)
      if (self._useCache) {
        self.requestsCache.set(self.url, response.body)
      }
      self.setStatus('standby')
    }, function(error) {
      self._error(error)
    })
  } else {
    self.emit('data', cached[self.url])
    self.setStatus('standby')
  }
}

Task.prototype._getTorrent = function () {
  var self = this

  readTorrent(self.url, function(err, torrent) {
    if (err) {
      self._error(err)
    } else {
      self.emit('data', TorrentUtils.getEverything(torrent))
    }
    self.setStatus('standby')
  })
}

Task.prototype._streamLocalFile = function (filename) {
  var self = this
  var fs = require('fs')
  var readline = require('readline')
  var stream = require('stream')

  var instream = fs.createReadStream(filename)
  var outstream = new stream
  var rl = readline.createInterface(instream, outstream)

  self._lines = ''
  self._numLines = 0
  self._totalNumLines = 0

  rl.on('line', function(line) {
    self._lines += line + "\n"
    self._numLines++
    if (self._numLines >= 1000) {
      self._totalNumLines += self._numLines
      self.emit('data', self._lines)
      self._lines = ''
      self._numLines = 0
    }
  })

  rl.on('close', function() {
    if (self._numLines) {
      self._totalNumLines += self._numLines
      self.emit('data', self._lines)
      self._lines = ''
      self._numLines = 0
      self.setStatus('standby')
    }
    fs.unlink(filename, function (err) {
      if (err) self._error(err)
    })
  })
}

Task.prototype._error = function (err) {
  var self = this
  self.setStatus('standby')
  self.emit('error', err)
}

Task.prototype.setCache = function (ttl, checkinterval) {
  var self = this
  self._useCache = true
  self.requestsCache = new NodeCache( { stdTTL: ttl, checkperiod: checkinterval } )
}