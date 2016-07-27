'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it

var index = require('../index.js')
var shared = require('../commands/shared.js')

describe('commands', function () {
  index.commands.forEach(function (command) {
    it(`${command.topic}:${command.command} takes a CLUSTER argument`, function () {
      expect(command.args.map(function (arg) { return arg.name })).to.include('CLUSTER')
    })
  })
})

describe('parseDuration', function () {
  let cases = [
    ['10', 10],
    ['10ms', 10],
    ['10 ms', 10],
    ['10 milliseconds', 10],
    ['1 millisecond', 1],

    ['10s', 10 * 1000],
    ['10 s', 10 * 1000],
    ['1 second', 1 * 1000],
    ['10 seconds', 10 * 1000],

    ['10m', 10 * 1000 * 60],
    ['10 m', 10 * 1000 * 60],
    ['1 minute', 1 * 1000 * 60],
    ['10 minutes', 10 * 1000 * 60],

    ['10h', 10 * 1000 * 60 * 60],
    ['10 h', 10 * 1000 * 60 * 60],
    ['1 hour', 1 * 1000 * 60 * 60],
    ['10 hours', 10 * 1000 * 60 * 60],

    ['10d', 10 * 1000 * 60 * 60 * 24],
    ['10 d', 10 * 1000 * 60 * 60 * 24],
    ['1 day', 1 * 1000 * 60 * 60 * 24],
    ['10 days', 10 * 1000 * 60 * 60 * 24]
  ]
  cases.forEach(function (testcase) {
    let duration = testcase[0]
    let expected = testcase[1]

    it(`parses '${duration}' as '${expected}'`, function () {
      let actual = shared.parseDuration(duration)
      expect(actual).to.equal(expected)
    })
  })
})
