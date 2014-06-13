/**
 * Created by Theadd on 6/5/14.
 */

exports.Task = Task

var fs = require('fs')
var http = require('http')
var url = require('url')
var zlib = require('zlib')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var requestify = require('requestify')
var nt = require('nt')
var TorrentUtils = require('./lib/TorrentUtils')

inherits(Task, EventEmitter)

function Task (target, interval) {
  var self = this
  EventEmitter.call(self)
  self._target = target
  self._intervalMs = interval
  self.setStatus('initialized')
}

Task.prototype.setStatus = function (state) {
  var self = this
  self.status = state || 'undefined'
  //console.log(self.status)
  self.emit('status', self.status)
}

Task.prototype.start = function () {
  var self = this
  self.setStatus('started')

  if (typeof self._target != 'string') {
    self._target()
  } else {
    self.url = self._target
    self._get()
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

Task.prototype._gunzip = function (buf) {
  var self = this
  self.setStatus('decompressing')

  zlib.gunzip(buf, function(err, buffer) {
    if (!err) {
      self.emit('data', buffer.toString())
    } else {
      self.emit('error', err)
    }
    self.setStatus('standby')
  })
}

Task.prototype._get = function () {
  var self = this
  self.setStatus('downloading')

  if (self.url.substr(-3) == '.gz') {
    self._getContent()
  } else if (self.url.substr(-8) == '.torrent') {
    self._getTorrent()
  } else {
    self._getFile()
  }
}

Task.prototype._getFile = function () {
  var self = this
  self.setStatus('downloading')

  var options = {
    host: url.parse(self.url).host,
    port: 80,
    path: url.parse(self.url).pathname
  }

  http.get(options, function(res) {
    var data = [], dataLen = 0

    res.on('data', function(chunk) {

      data.push(chunk)
      dataLen += chunk.length

    }).on('end', function() {
        var buf = new Buffer(dataLen)

        for (var i=0, len = data.length, pos = 0; i < len; i++) {
          data[i].copy(buf, pos)
          pos += data[i].length
        }
        self.setStatus('downloaded')

        self._gunzip(buf)
      })
  })
}

Task.prototype._getContent = function () {
  var self = this

  requestify.get(self.url).then(function(response) {

    response.getBody();
    self.emit('data', response.body)
    self.setStatus('standby')
  })
}

Task.prototype._getTorrent = function () {
  var self = this

  nt.read(self.url, function(err, torrent) {
    if (err) {
      self.emit('error', err)
    } else {
      self.emit('data', TorrentUtils.getEverything(torrent.metadata))
    }
    self.setStatus('standby')
  })
}
