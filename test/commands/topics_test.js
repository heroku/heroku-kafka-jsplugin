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

const cmd = proxyquire('../../commands/topics', {
  '../lib/clusters': {
    withCluster
  }
}).cmd

describe('kafka:topics', () => {
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

  describe('with no topics in the cluster', () => {
    it('indicates there are no topics', () => {
      kafka.get(topicsUrl('kafka-1')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: []
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL

No topics found on this Kafka cluster.
Use heroku kafka:topics:create to create a topic.
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })

    it('ignores the __consumer_offsets topic', () => {
      kafka.get(topicsUrl('kafka-1')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          { name: '__consumer_offsets', messages_in_per_second: 9.0, bytes_in_per_second: 2 }
        ]
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL

No topics found on this Kafka cluster.
Use heroku kafka:topics:create to create a topic.
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })
  })

  describe('with some topics in the cluster', () => {
    it('displays information about these topics', () => {
      kafka.get(topicsUrl('kafka-1')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          { name: 'topic-1', messages_in_per_second: 10.0, bytes_in_per_second: 0 },
          { name: 'topic-2', messages_in_per_second: 12.0, bytes_in_per_second: 3 }
        ]
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL

Name     Messages  Traffic
───────  ────────  ───────────
topic-1  10/sec    0 bytes/sec
topic-2  12/sec    3 bytes/sec
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })

    it('omits information about the special __consumer_offsets topic', () => {
      kafka.get(topicsUrl('kafka-1')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          { name: '__consumer_offsets', messages_in_per_second: '9.0', bytes: '2' },
          { name: 'topic-1', messages_in_per_second: 10.0, bytes_in_per_second: 0 },
          { name: 'topic-2', messages_in_per_second: 12.0, bytes_in_per_second: 3 }
        ]
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL

Name     Messages  Traffic
───────  ────────  ───────────
topic-1  10/sec    0 bytes/sec
topic-2  12/sec    3 bytes/sec
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })
  })
})
