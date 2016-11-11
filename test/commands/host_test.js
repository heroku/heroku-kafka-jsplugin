'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.beforeEach

const host = require('../../lib/host.js')

describe('host', () => {
  it(`is the default host`, () => {
    expect(host()).to.equal('kafka-api.heroku.com')
  })
})
