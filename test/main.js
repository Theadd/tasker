var Task = require('../').Task
var test = require('tape')

test('tasker: fetch url', function (t) {
  t.plan(2)

  var parser = new Task('https://raw.githubusercontent.com/Theadd/tasker/master/test/samples/sample.txt.gz', 0)
  parser.on('error', function (err) {
    t.fail(err)
  })
  parser.on('data', function (data) {
    t.pass('data received')
    t.equal(typeof data, 'string')
  })
  parser.start()

})

test('tasker: get torrent', function (t) {
  t.plan(2)

  var parser = new Task('https://raw.githubusercontent.com/Theadd/tasker/master/test/samples/sample.torrent', 0)
  parser.on('error', function (err) {
    t.fail(err)
  })
  parser.on('data', function (data) {
    t.pass('data received')
    t.equal(typeof data, 'object')
  })
  parser.start()

})
