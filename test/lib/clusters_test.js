'use strict'

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')

chai.use(chaiAsPromised)

const proxyquire = require('proxyquire')
const expect = chai.expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach

const cli = require('heroku-cli-util')
const co = require('co')

const heroku = {}

let fetchAll
let fetchOne

const fetcher = (arg) => {
  expect(arg).to.equal(heroku)
  return {
    all: fetchAll,
    addon: fetchOne
  }
}

const clusters = proxyquire('../../lib/clusters', {
  './fetcher': fetcher
})

describe('withCluster', () => {
  beforeEach(() => {
    fetchOne = () => Promise.resolve(null)
    fetchAll = () => Promise.resolve([])
    cli.exit.mock()
    cli.mockConsole()
  })

  describe('with an explicit cluster argument', () => {
    it('propagates the error if the fetcher rejects the promise', async () => {
      fetchOne = () => Promise.reject(new Error('oh snap'))
      let called = false
      await expect(co.wrap(clusters.withCluster)(heroku,
                                                  'my-app', 'kafka-1',
                                                  function * (arg) { called = true }))
        .to.be.rejected
      return expect(called).to.be.false
    })

    it('invokes the callback with the returned add-on', async () => {
      let addon = { name: 'kafka-1' }
      fetchOne = () => Promise.resolve(addon)
      let calledWith = addon
      await expect(co.wrap(clusters.withCluster)(heroku,
                                                  'my-app', 'kafka-1',
                                                  function * (arg) { calledWith = arg }))
        .to.be.fulfilled
      return expect(calledWith).to.equal(addon)
    })
  })

  describe('with no explicit cluster argument', () => {
    it('warns and exits if no add-ons are found', async () => {
      fetchAll = () => Promise.resolve([])
      let called = false
      await expect(co.wrap(clusters.withCluster)(heroku,
                                                  'my-app', null,
                                                  function * (arg) { called = true }))
        .to.be.rejectedWith(cli.exit.ErrorExit, /found no kafka add-ons on my-app/)
      return expect(called).to.be.false
    })

    it('warns and exits if multiple add-ons are found', async () => {
      fetchAll = () => Promise.resolve([ { name: 'kafka-1' }, { name: 'kafka-2' } ])
      let called = false
      await expect(co.wrap(clusters.withCluster)(heroku,
                                                  'my-app', null,
                                                  function * (arg) { called = true }))
        .to.be.rejectedWith(cli.exit.ErrorExit, /found more than one kafka add-on on my-app: kafka-1, kafka-2/)
      return expect(called).to.be.false
    })

    it('invokes the callback with the returned add-on', async () => {
      let addon = { name: 'kafka-1' }
      fetchAll = () => Promise.resolve([ addon ])
      let calledWith = addon
      await expect(co.wrap(clusters.withCluster)(heroku,
                                                  'my-app', null,
                                                  function * (arg) { calledWith = arg }))
        .to.be.fulfilled
      expect(calledWith).to.equal(addon)
    })
  })
})
