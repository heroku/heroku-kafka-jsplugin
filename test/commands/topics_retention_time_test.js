'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const proxyquire = require('proxyquire')
const expectExit = require('../expect_exit')

const cli = require('heroku-cli-util')
const nock = require('nock')

const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' })
}

const cmd = proxyquire('../../commands/topics_retention_time', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:topics:retention-time', () => {
  let kafka

  let topicConfigUrl = (cluster, topic) => {
    return `/data/kafka/v0/clusters/${cluster}/topics/${topic}`
  }

  let topicListUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}/topics`
  }

  let infoUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}`
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

  describe('with unknown value specified', () => {
    it('shows an error and exits', () => {
      return expectExit(1, cmd.run({app: 'myapp',
                                    args: { TOPIC: 'topic-1', VALUE: '1 fortnight' },
                                    flags: {}}))
        .then(() => expect(cli.stdout).to.be.empty)
        .then(() => expect(cli.stderr).to.equal(` ▸    Unknown retention time '1 fortnight'; expected 'disable' or value like
 ▸    '36h' or '10d'
`))
    })
  })

  describe('if the cluster supports a mixed cleanup policy', () => {
    beforeEach(() => {
      kafka.get(topicListUrl('00000000-0000-0000-0000-000000000000'))
           .reply(200, { topics: [ { name: 'topic-1', retention_time_ms: 123, compaction: false } ] })
      kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
           .reply(200, {
             capabilities: { supports_mixed_cleanup_policy: true },
             limits: { minimum_retention_ms: 20 }
           })
    })

    it('sets retention time and leaves compaction as is if a value is specified', () => {
      kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                { topic: { name: 'topic-1', retention_time_ms: 60000, compaction: false } }).reply(200)

      return cmd.run({app: 'myapp',
                      args: { TOPIC: 'topic-1', VALUE: '60s' },
                      flags: {}})
                .then(() => expect(cli.stderr).to.equal('Setting retention time to 60s for topic topic-1 on kafka-1... done\n'))
                .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
    })

    it('clears retention and turns on compaction if `disabled` is specified', () => {
      kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                { topic: { name: 'topic-1', retention_time_ms: null, compaction: true } }).reply(200)

      return cmd.run({app: 'myapp',
                      args: { TOPIC: 'topic-1', VALUE: 'disable' },
                      flags: {}})
                .then(() => expect(cli.stderr).to.equal('Disabling time-based retention and enabling compaction for topic topic-1 on kafka-1... done\n'))
                .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
    })
  })

  describe('if the cluster does not support a mixed cleanup policy', () => {
    beforeEach(() => {
      kafka.get(topicListUrl('00000000-0000-0000-0000-000000000000'))
           .reply(200, { topics: [ { name: 'topic-1', retention_time_ms: 123, compaction: true } ] })
      kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
           .reply(200, {
             capabilities: { supports_mixed_cleanup_policy: false },
             limits: { minimum_retention_ms: 20 }
           })
    })

    it('sets retention time and turns off compaction if a value is specified', () => {
      kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                { topic: { name: 'topic-1', retention_time_ms: 60000, compaction: false } }).reply(200)

      return cmd.run({app: 'myapp',
                      args: { TOPIC: 'topic-1', VALUE: '60s' },
                      flags: {}})
                .then(() => expect(cli.stderr).to.equal('Setting retention time to 60s and disabling compaction for topic topic-1 on kafka-1... done\n'))
                .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
    })

    it('clears retention and turns on compaction if `disabled` is specified', () => {
      kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                { topic: { name: 'topic-1', retention_time_ms: null, compaction: true } }).reply(200)

      return cmd.run({app: 'myapp',
                      args: { TOPIC: 'topic-1', VALUE: 'disable' },
                      flags: {}})
                .then(() => expect(cli.stderr).to.equal('Disabling time-based retention for topic topic-1 on kafka-1... done\n'))
                .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
    })
  })
})
