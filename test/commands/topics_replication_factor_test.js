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
  yield callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' })
}

const cmd = proxyquire('../../commands/topics_replication_factor', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:topics:replication-factor', () => {
  let kafka

  let topicConfigUrl = (cluster, topic) => {
    return `/data/kafka/v0/clusters/${cluster}/topics/${topic}`
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

  it('sets replication factor to the specified value', () => {
    kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
              { topic: { name: 'topic-1', replication_factor: '5' } }).reply(200)

    return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1', VALUE: '5' }})
              .then(() => expect(cli.stderr).to.equal('Setting replication factor for topic topic-1 to 5... done\n'))
              .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
  })
})
