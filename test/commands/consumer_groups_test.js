'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const proxyquire = require('proxyquire')

const cli = require('@heroku/heroku-cli-util')
const nock = require('nock')

const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' })
}

const VERSION = 'v0'

const cmd = proxyquire('../../commands/consumer_groups', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:consumer-groups', () => {
  let kafka

  let consumerGroupsUrl = (cluster) => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/consumer_groups`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
    cli.mockConsole()
    cli.exit.mock()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('displays a list of consumer groups', () => {
    kafka.get(consumerGroupsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA',
      consumer_groups: [
        { name: 'consumer-group-1' },
        { name: 'consumer-group-2' }
      ]
    })

    return cmd.run({app: 'myapp', args: {}})
      .then(() => expect(cli.stdout).to.equal(`=== Kafka Consumer Groups on HEROKU_KAFKA

Name
────────────────
consumer-group-1
consumer-group-2
`))
      .then(() => expect(cli.stderr).to.be.empty)
  })
})
