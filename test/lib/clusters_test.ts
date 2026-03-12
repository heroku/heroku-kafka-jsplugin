import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {describe, it, beforeEach, afterEach} from 'mocha'
import esmock from 'esmock'
import cli from '@heroku/heroku-cli-util'
import * as td from 'testdouble'

chai.use(chaiAsPromised)
const {expect} = chai

const heroku: any = {}

let fetchAll: any
let fetchOne: any

const fetcher = (arg: any) => {
  expect(arg).to.equal(heroku)
  return {
    all: fetchAll,
    addon: fetchOne
  }
}

const clusters = await esmock('../../lib/clusters.ts', {
  '../../lib/fetcher.ts': fetcher
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
      return expect(clusters.withCluster(
        heroku,
        'my-app', 'kafka-1',
        async (arg) => { called = true })
      )
        .to.be.rejected
        .then(() => { expect(called).to.be.false })
    })

    it('invokes the callback with the returned add-on', () => {
      let addon = { name: 'kafka-1' }
      fetchOne = () => Promise.resolve(addon)
      let calledWith = addon
      return expect(clusters.withCluster(
        heroku,
        'my-app', 'kafka-1',
        async (arg) => { calledWith = arg })
      )
        .to.be.fulfilled
        .then(() => { expect(calledWith).to.equal(addon) })
    })
  })

  describe('with no explicit cluster argument', () => {
    it('warns and exits if no add-ons are found', () => {
      fetchAll = () => Promise.resolve([])
      let called = false
      return expect(clusters.withCluster(
        heroku,
        'my-app', null,
        async (arg) => { called = true })
      )
        .to.be.rejectedWith(cli.exit.ErrorExit, /found no kafka add-ons on my-app/)
        .then(() => { expect(called).to.be.false })
    })

    it('warns and exits if multiple add-ons are found', () => {
      fetchAll = () => Promise.resolve([ { name: 'kafka-1' }, { name: 'kafka-2' } ])
      let called = false
      return expect(clusters.withCluster(
        heroku,
        'my-app', null,
        async (arg) => { called = true })
      )
        .to.be.rejectedWith(cli.exit.ErrorExit, /found more than one kafka add-on on my-app: kafka-1, kafka-2/)
        .then(() => { expect(called).to.be.false })
    })

    it('invokes the callback with the returned add-on', () => {
      let addon = { name: 'kafka-1' }
      fetchAll = () => Promise.resolve([ addon ])
      let calledWith = addon
      return expect(clusters.withCluster(
        heroku,
        'my-app', null,
        async (arg) => { calledWith = arg })
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
    const mockRequest = td.func('request')
    td.when(mockRequest(`https://api.data.heroku.com/data/kafka/v0/clusters/${addonId}/topics`, td.matchers.anything()))
      .thenResolve({
        body: {
          topics: [
            { name: topicName },
            { name: 'bar' }
          ]
        }
      })
    const heroku = { request: mockRequest }
    const result = await clusters.topicConfig(heroku, addonId, topicName)
    expect(result.name).to.equal(topicName)
  })

  it('finds the topic when prefixed', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const topicPrefix = 'wisła-3456.'
    const mockRequest = td.func('request')
    td.when(mockRequest(`https://api.data.heroku.com/data/kafka/v0/clusters/${addonId}/topics`, td.matchers.anything()))
      .thenResolve({
        body: {
          topics: [
            { name: topicName, prefix: topicPrefix },
            { name: 'bar', prefix: topicPrefix }
          ]
        }
      })
    const heroku = { request: mockRequest }
    const result = await clusters.topicConfig(heroku, addonId, topicName)
    expect(result.name).to.equal(topicName)
  })

  it('finds the topic if the prefix is specified explicitly', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const topicPrefix = 'wisła-3456.'
    const mockRequest = td.func('request')
    td.when(mockRequest(`https://api.data.heroku.com/data/kafka/v0/clusters/${addonId}/topics`, td.matchers.anything()))
      .thenResolve({
        body: {
          topics: [
            { name: topicName, prefix: topicPrefix },
            { name: 'bar', prefix: topicPrefix }
          ]
        }
      })
    const heroku = { request: mockRequest }
    const result = await clusters.topicConfig(heroku, addonId, topicPrefix + topicName)
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
    expect(clusters.topicConfig(heroku, addonId, topicName))
      .to.be.rejectedWith(cli.exit.ErrorExit, `topic ${topicName} not found`)
  })
})
