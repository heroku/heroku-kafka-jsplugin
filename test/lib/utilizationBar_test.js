'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const beforeEach = mocha.beforeEach
const it = mocha.it

const cli = require('heroku-cli-util')

const utilizationBar = require('../../lib/utilizationBar')

describe('utilizationBar', function () {
  beforeEach(() => {
    cli.mockConsole()
    cli.color.enabled = true
  })

  const cases = [
    [0, 100, '[··········]', '[···············]'],
    [100, 100, '[██████████]', '[███████████████]'],
    [99, 100, '[█████████·]', '[██████████████·]'],
    [50, 100, '[█████·····]', '[███████········]'],
    [110, 100, '[██████████]', '[███████████████]'],
    [-50, 100, '[··········]', '[···············]']
  ]
  cases.forEach(function (testcase) {
    const current = testcase[0]
    const total = testcase[1]
    const expected10 = testcase[2]
    const expected15 = testcase[3]
    it(`Renders a ${current}/${total} bar correctly`, function () {
      expect(utilizationBar(current, total)).to.equal(expected10)
      expect(utilizationBar(current, total, 15)).to.equal(expected15)
    })
  })
})
