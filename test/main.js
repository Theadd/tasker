var Task = require('../').Task
var test = require('tape')

var parser = null


test('tasker: fetch url', function (t) {
  t.plan(2)

  parser = new Task('https://raw.githubusercontent.com/Theadd/tasker/master/test/samples/sample.txt.gz', 0)
  parser.on('error', function (err) {
    t.fail(err)
  })
  parser.on('data', function (data) {
    t.pass('received data from parser')
    t.equal(typeof data, 'string')
  })
  parser.start()

})

