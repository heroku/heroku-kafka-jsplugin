'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it

const utilizationBar = require('../../lib/utilizationBar')

describe('utilizationBar', function () {
  const cases = [
    [0, 100, '[··········]', '[···············]'],
    [100, 100, '[\u001b[34m██████████\u001b[39m]', '[\u001b[34m███████████████\u001b[39m]'],
    [99, 100, '[\u001b[34m█████████\u001b[39m·]', '[\u001b[34m██████████████\u001b[39m·]'],
    [50, 100, '[\u001b[34m█████\u001b[39m·····]', '[\u001b[34m███████\u001b[39m········]'],
    [110, 100, '[\u001b[34m██████████\u001b[39m]', '[\u001b[34m███████████████\u001b[39m]'],
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
