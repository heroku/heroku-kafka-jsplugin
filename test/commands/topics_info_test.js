'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.beforeEach
const proxyquire = require('proxyquire')

const cli = require('heroku-cli-util')
const nock = require('nock')

const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1' })
}

const cmd = proxyquire('../../commands/topics_info', {
  '../lib/clusters': {
    withCluster
  }
}).cmd

describe('kafka:topics:info', () => {
  let kafka

  let topicsUrl = (cluster, topic) => {
    return `/client/kafka/v0/clusters/${cluster}/topics/${topic}`
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
    kafka.get(topicsUrl('kafka-1', 'topic-1')).reply(200, {
      attachment_name: 'HEROKU_KAFKA_BLUE_URL',
      topic: 'topic-1',
      info: [
        { name: 'Producers', values: [ '0.0 messages/second (0 Bytes/second) total' ] },
        { name: 'Consumers', values: [ '0 Bytes/second total' ] },
        { name: 'Partitions', values: [ '3 partitions' ] },
        { name: 'Replication Factor', values: [ '3 (recommend > 1)' ] },
        { name: 'Compaction', values: [ 'Compaction is disabled for topic-1' ] },
        { name: 'Retention', values: [ '24 hours' ] }
      ]
    })

    return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }})
      .then(() => expect(cli.stdout).to.equal(`=== HEROKU_KAFKA_BLUE_URL :: topic-1

Producers:          0.0 messages/second (0 Bytes/second) total
Consumers:          0 Bytes/second total
Partitions:         3 partitions
Replication Factor: 3 (recommend > 1)
Compaction:         Compaction is disabled for topic-1
Retention:          24 hours
`))
      .then(() => expect(cli.stderr).to.be.empty)
  })
})
