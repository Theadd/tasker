var Parser = require('../').Parser
var test = require('tape')

var parser = null

/*
function createTask (cb) {

  parser = new Parser('http://ext.bitsnoop.com/export/b3_e003_trackers.txt.gz', 10000)
  parser.on('error', function (err) {
    t.fail(err.message)
  })
  parser.on('data', function (data) {
    cb(null, data)
  })
  parser.start()

}

test('tasker: fetch url', function (t) {
  t.plan(1)

  createTask(function (err, data) {
    t.error(err)
  })
})

*/

test('tasker: fetch url', function (t) {
  t.plan(2)

  parser = new Parser('http://ext.bitsnoop.com/export/b3_e003_trackers.txt.gz', 0)
  parser.on('error', function (err) {
    t.fail(err)
  })
  parser.on('data', function (data) {
    t.pass('received data from parser')
    t.equal(typeof data, 'string')
  })
  parser.start()

})

