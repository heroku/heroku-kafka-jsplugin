'use strict'
/* eslint no-unused-expressions: off */

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
    it('propagates the error if the fetcher rejects the promise', () => {
      fetchOne = () => Promise.reject(new Error('oh snap'))
      return expect(clusters.withCluster(heroku, 'my-app', 'kafka-1'))
        .to.be.rejected
    })

    it('invokes the callback with the returned add-on', async () => {
      fetchOne = () => Promise.resolve({name: 'kafka-1'})
      let addon = await clusters.withCluster(heroku, 'my-app', 'kafka-1')
      expect(addon.name).to.equal('kafka-1')
    })
  })

  describe('with no explicit cluster argument', () => {
    it('warns and exits if no add-ons are found', () => {
      fetchAll = () => Promise.resolve([])
      return expect(clusters.withCluster(heroku, 'my-app', null))
        .to.be.rejectedWith(cli.exit.ErrorExit, /found no kafka add-ons on my-app/)
    })

    it('warns and exits if multiple add-ons are found', () => {
      fetchAll = () => Promise.resolve([ { name: 'kafka-1' }, { name: 'kafka-2' } ])
      return expect(clusters.withCluster(heroku, 'my-app', null))
        .to.be.rejectedWith(cli.exit.ErrorExit, /found more than one kafka add-on on my-app: kafka-1, kafka-2/)
    })

    it('invokes the callback with the returned add-on', async () => {
      fetchAll = () => Promise.resolve([{name: 'kafka-1'}])
      let addon = await clusters.withCluster(heroku, 'my-app', null)
      expect(addon.name).to.equal('kafka-1')
    })
  })
})
