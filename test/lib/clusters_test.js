'use strict'
/* eslint standard/no-callback-literal: off, no-unused-expressions: off */

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

const td = require('testdouble')

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
      let called = false
      return expect(co.wrap(clusters.withCluster)(
        heroku,
        'my-app', 'kafka-1',
        function * (arg) { called = true })
      )
        .to.be.rejected
        .then(() => { expect(called).to.be.false })
    })

    it('invokes the callback with the returned add-on', () => {
      let addon = { name: 'kafka-1' }
      fetchOne = () => Promise.resolve(addon)
      let calledWith = addon
      return expect(co.wrap(clusters.withCluster)(
        heroku,
        'my-app', 'kafka-1',
        function * (arg) { calledWith = arg })
      )
        .to.be.fulfilled
        .then(() => { expect(calledWith).to.equal(addon) })
    })
  })

  describe('with no explicit cluster argument', () => {
    it('warns and exits if no add-ons are found', () => {
      fetchAll = () => Promise.resolve([])
      let called = false
      return expect(co.wrap(clusters.withCluster)(
        heroku,
        'my-app', null,
        function * (arg) { called = true })
      )
        .to.be.rejectedWith(cli.exit.ErrorExit, /found no kafka add-ons on my-app/)
        .then(() => { expect(called).to.be.false })
    })

    it('warns and exits if multiple add-ons are found', () => {
      fetchAll = () => Promise.resolve([ { name: 'kafka-1' }, { name: 'kafka-2' } ])
      let called = false
      return expect(co.wrap(clusters.withCluster)(
        heroku,
        'my-app', null,
        function * (arg) { called = true })
      )
        .to.be.rejectedWith(cli.exit.ErrorExit, /found more than one kafka add-on on my-app: kafka-1, kafka-2/)
        .then(() => { expect(called).to.be.false })
    })

    it('invokes the callback with the returned add-on', () => {
      let addon = { name: 'kafka-1' }
      fetchAll = () => Promise.resolve([ addon ])
      let calledWith = addon
      return expect(co.wrap(clusters.withCluster)(
        heroku,
        'my-app', null,
        function * (arg) { calledWith = arg })
      )
        .to.be.fulfilled
        .then(() => { expect(calledWith).to.equal(addon) })
    })
  })
})

describe('topicConfig', () => {
  beforeEach(() => {
    cli.exit.mock()
    cli.mockConsole()
  })

  it('finds the topic when not prefixed', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const heroku = {
      request: td.when(td.function()({
        host: 'api.data.heroku.com',
        accept: 'application/json',
        path: `/data/kafka/v0/clusters/${addonId}/topics`
      })).thenResolve({
        topics: [
          { name: topicName },
          { name: 'bar' }
        ]
      })
    }
    const result = await co.wrap(clusters.topicConfig)(heroku, addonId, topicName)
    expect(result.name).to.equal(topicName)
  })

  it('finds the topic when prefixed', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const topicPrefix = 'wisła-3456.'
    const heroku = {
      request: td.when(td.function()({
        host: 'api.data.heroku.com',
        accept: 'application/json',
        path: `/data/kafka/v0/clusters/${addonId}/topics`
      })).thenResolve({
        topics: [
          { name: topicName, prefix: topicPrefix },
          { name: 'bar', prefix: topicPrefix }
        ]
      })
    }
    const result = await co.wrap(clusters.topicConfig)(heroku, addonId, topicName)
    expect(result.name).to.equal(topicName)
  })

  it('finds the topic if the prefix is specified explicitly', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const topicPrefix = 'wisła-3456.'
    const heroku = {
      request: td.when(td.function()({
        host: 'api.data.heroku.com',
        accept: 'application/json',
        path: `/data/kafka/v0/clusters/${addonId}/topics`
      })).thenResolve({
        topics: [
          { name: topicName, prefix: topicPrefix },
          { name: 'bar', prefix: topicPrefix }
        ]
      })
    }
    const result = await co.wrap(clusters.topicConfig)(heroku, addonId, topicPrefix + topicName)
    expect(result.name).to.equal(topicName)
  })

  it('exits if it cannot find the topic', () => {
    const addonId = '1234'
    const topicName = 'foo'
    const heroku = {
      request: td.when(td.function()({
        host: 'api.data.heroku.com',
        accept: 'application/json',
        path: `/data/kafka/v0/clusters/${addonId}/topics`
      })).thenResolve({
        topics: [
          { name: 'bar' },
          { name: 'baz' }
        ]
      })
    }
    expect(co.wrap(clusters.topicConfig)(heroku, addonId, topicName))
      .to.be.rejectedWith(cli.exit.ErrorExit, `topic ${topicName} not found`)
  })
})
