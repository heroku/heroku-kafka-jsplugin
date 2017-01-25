'use strict'

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

const cmd = proxyquire('../../commands/topics_info', {
  '../lib/clusters': {
    withCluster
  }
}).cmd

describe('kafka:topics:info', () => {
  let kafka

  let topicsUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}/topics`
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

  it('displays the topic info', () => {
    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA_BLUE_URL',
      topics: [
        {
          name: 'topic-1',
          messages_in_per_second: 0,
          bytes_in_per_second: 0,
          bytes_out_per_second: 0,
          replication_factor: 3,
          partitions: 3,
          compaction_enabled: false,
          retention_time_ms: 86400000
        }
      ]
    })

    return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }})
      .then(() => expect(cli.stdout).to.equal(`=== HEROKU_KAFKA_BLUE_URL :: topic-1

Producers:          0 messages/second (0 bytes/second) total
Consumers:          0 bytes/second total
Partitions:         3 partitions
Replication Factor: 3
Compaction:         Compaction is disabled for topic-1
Retention:          24 hours
`))
      .then(() => expect(cli.stderr).to.be.empty)
  })
})
