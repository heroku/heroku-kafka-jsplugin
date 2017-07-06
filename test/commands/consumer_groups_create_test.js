'use strict'
/* eslint standard/no-callback-literal: off, no-unused-expressions: off */

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const proxyquire = require('proxyquire')

const cli = require('heroku-cli-util')
const nock = require('nock')

const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' })
}

const VERSION = 'v0'

const cmd = proxyquire('../../commands/consumer_groups_create', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:consumer-groups:create', () => {
  let kafka

  let consumerGroupsUrl = (cluster) => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/consumer_groups`
  }

  beforeEach(() => {
    kafka = nock('https://kafka-api.heroku.com:443')
    cli.mockConsole()
    cli.exit.mock()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('creates a consumer group on the cluster', () => {
    kafka.post(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'),
      {
        consumer_group: {
          name: 'consumer-group-1'
        }
      }
    ).reply(200)

    return cmd.run({app: 'myapp',
      args: { CONSUMER_GROUP: 'consumer-group-1' }})
      .then(() => {
        expect(cli.stdout).to.equal('Use `heroku kafka:consumer-groups` to list your consumer groups.\n')
      })
  })

  it("doesn't raise when the api 400s", () => {
    kafka.post(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'),
      {
        consumer_group: {
          name: 'consumer-group-1'
        }
      }
    ).reply(400, {message: 'this command is not required or enabled on dedicated clusters'})

    return cmd.run({app: 'myapp',
      args: { CONSUMER_GROUP: 'consumer-group-1' }})
      .then(() => {
        expect(cli.stderr).to.equal(`Creating consumer group consumer-group-1... !\n ▸    kafka-1 does not need consumer groups managed explicitly, so this command\n ▸    does nothing\n`)
      })
  })
})
