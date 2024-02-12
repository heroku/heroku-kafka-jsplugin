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
      const resultWithANSI = utilizationBar(current, total)
      // eslint-disable-next-line no-control-regex
      const resultWithoutANSI = resultWithANSI.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
      const result2WithANSI = utilizationBar(current, total, 15)
      // eslint-disable-next-line no-control-regex
      const result2WithoutANSI = result2WithANSI.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')

      expect(resultWithoutANSI).to.equal(expected10)
      expect(result2WithoutANSI).to.equal(expected15)
    })
  })
})
