'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach

const cli = require('heroku-cli-util')

const shared = require('../../lib/shared')

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
    ['10 days', 10 * 1000 * 60 * 60 * 24],

    ['1 fortnight', null]
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

describe('parseBool', function () {
  let cases = [
    ['yes', true],
    ['true', true],
    ['on', true],
    ['enable', true],

    ['no', false],
    ['false', false],
    ['off', false],
    ['disable', false],

    ['nope', undefined],
    ['yep', undefined]
  ]
  cases.forEach(function (testcase) {
    let str = testcase[0]
    let expected = testcase[1]

    it(`parses '${str}' as '${expected}'`, function () {
      let actual = shared.parseBool(str)
      expect(actual).to.equal(expected)
    })
  })
})

describe('deprecated', function () {
  beforeEach(() => cli.mockConsole())

  it('returns a function that prints a warning and runs the command', function () {
    let context
    let heroku
    let fn = function * (c, h) {
      context = c
      heroku = h
      yield 42
    }
    let wrapped = shared.deprecated(fn, 'new-command')

    let passedContext = { command: { command: 'foo', topic: 'bar' } }
    let passedHeroku = {}

    let result = wrapped(passedContext, passedHeroku).next()

    expect(context).to.eq(context)
    expect(heroku).to.eq(heroku)
    expect(result.value).to.eq(42)
    expect(cli.stderr).to.match(/ ▸\s*WARNING: bar:foo is deprecated; please use bar:new-command/m)
  })
})
