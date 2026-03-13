import {expect} from 'chai'
import esmock from 'esmock'
import {beforeEach, describe, it} from 'mocha'
import sinon from 'sinon'

const heroku: any = {}

let fetchAll: any
let fetchOne: any

const fetcher = (arg: any) => {
  expect(arg).to.equal(heroku)
  return {
    addon: fetchOne,
    all: fetchAll,
  }
}

const clusters = await esmock('../../src/lib/clusters.ts', {
  '../../src/lib/fetcher.ts': fetcher,
})

describe('withCluster', () => {
  beforeEach(() => {
    fetchOne = () => Promise.resolve(null)
    fetchAll = () => Promise.resolve([])
  })

  describe('with an explicit cluster argument', () => {
    it('propagates the error if the fetcher rejects the promise', async () => {
      fetchOne = () => Promise.reject(new Error('oh snap'))
      let called = false
      try {
        await clusters.withCluster(
          heroku,
          'my-app',
          'kafka-1',
          async arg => {
            called = true
          },
        )
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect(called).to.be.false
      }
    })

    it('invokes the callback with the returned add-on', async () => {
      const addon = {name: 'kafka-1'}
      fetchOne = () => Promise.resolve(addon)
      let calledWith = addon
      await clusters.withCluster(
        heroku,
        'my-app',
        'kafka-1',
        async arg => {
          calledWith = arg
        },
      )
      expect(calledWith).to.equal(addon)
    })
  })

  describe('with no explicit cluster argument', () => {
    it('warns and exits if no add-ons are found', async () => {
      fetchAll = () => Promise.resolve([])
      let called = false
      try {
        await clusters.withCluster(
          heroku,
          'my-app',
          null,
          async arg => {
            called = true
          },
        )
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.match(/found no kafka add-ons on my-app/)
        expect(called).to.be.false
      }
    })

    it('warns and exits if multiple add-ons are found', async () => {
      fetchAll = () => Promise.resolve([{name: 'kafka-1'}, {name: 'kafka-2'}])
      let called = false
      try {
        await clusters.withCluster(
          heroku,
          'my-app',
          null,
          async arg => {
            called = true
          },
        )
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.match(/found more than one kafka add-on on my-app: kafka-1, kafka-2/)
        expect(called).to.be.false
      }
    })

    it('invokes the callback with the returned add-on', async () => {
      const addon = {name: 'kafka-1'}
      fetchAll = () => Promise.resolve([addon])
      let calledWith = addon
      await clusters.withCluster(
        heroku,
        'my-app',
        null,
        async arg => {
          calledWith = arg
        },
      )
      expect(calledWith).to.equal(addon)
    })
  })
})

describe('topicConfig', () => {
  it('finds the topic when not prefixed', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const mockRequest = sinon.stub()
    mockRequest
    .withArgs(`https://api.data.heroku.com/data/kafka/v0/clusters/${addonId}/topics`, sinon.match.any)
    .resolves({
      body: {
        topics: [
          {name: topicName},
          {name: 'bar'},
        ],
      },
    })
    const heroku = {request: mockRequest}
    const result = await clusters.topicConfig(heroku, addonId, topicName)
    expect(result.name).to.equal(topicName)
  })

  it('finds the topic when prefixed', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const topicPrefix = 'wisła-3456.'
    const mockRequest = sinon.stub()
    mockRequest
    .withArgs(`https://api.data.heroku.com/data/kafka/v0/clusters/${addonId}/topics`, sinon.match.any)
    .resolves({
      body: {
        topics: [
          {name: topicName, prefix: topicPrefix},
          {name: 'bar', prefix: topicPrefix},
        ],
      },
    })
    const heroku = {request: mockRequest}
    const result = await clusters.topicConfig(heroku, addonId, topicName)
    expect(result.name).to.equal(topicName)
  })

  it('finds the topic if the prefix is specified explicitly', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const topicPrefix = 'wisła-3456.'
    const mockRequest = sinon.stub()
    mockRequest
    .withArgs(`https://api.data.heroku.com/data/kafka/v0/clusters/${addonId}/topics`, sinon.match.any)
    .resolves({
      body: {
        topics: [
          {name: topicName, prefix: topicPrefix},
          {name: 'bar', prefix: topicPrefix},
        ],
      },
    })
    const heroku = {request: mockRequest}
    const result = await clusters.topicConfig(heroku, addonId, topicPrefix + topicName)
    expect(result.name).to.equal(topicName)
  })

  it('exits if it cannot find the topic', async () => {
    const addonId = '1234'
    const topicName = 'foo'
    const mockRequest = sinon.stub()
    mockRequest
    .withArgs(`https://api.data.heroku.com/data/kafka/v0/clusters/${addonId}/topics`, sinon.match.any)
    .resolves({
      body: {
        topics: [
          {name: 'bar'},
          {name: 'baz'},
        ],
      },
    })
    const heroku = {request: mockRequest}
    try {
      await clusters.topicConfig(heroku, addonId, topicName)
      expect.fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).to.equal(`topic ${topicName} not found`)
    }
  })
})
