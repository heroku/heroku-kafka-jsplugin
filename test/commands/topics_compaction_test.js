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

const cmd = proxyquire('../../commands/topics_compaction', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:topics:compaction', () => {
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
                                    args: { TOPIC: 'topic-1', VALUE: 'yep' }}))
        .then(() => expect(cli.stdout).to.be.empty)
        .then(() => expect(cli.stderr).to.equal(` ▸    Unknown value 'yep': must be 'on' or 'enable' to enable, or 'off' or
 ▸    'disable' to disable
`))
    })
  })

  const validEnable = [ 'enable', 'on' ]
  const validDisable = [ 'disable', 'off' ]

  describe('if the cluster supports a mixed cleanup policy', () => {
    beforeEach(() => {
      kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
           .reply(200, {
             capabilities: { supports_mixed_cleanup_policy: true },
             limits: { minimum_retention_ms: 20 }
           })
    })

    validEnable.forEach((value) => {
      it(`uses the original retention and turns compaction on with argument ${value}`, () => {
        kafka.get(topicListUrl('00000000-0000-0000-0000-000000000000'))
             .reply(200, { topics: [ { name: 'topic-1', retention_time_ms: 123 } ] })
        kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                  { topic: { name: 'topic-1', compaction: true, retention_time_ms: 123 } })
             .reply(200)

        return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1', VALUE: value }})
                  .then(() => expect(cli.stderr).to.equal('Enabling compaction for topic topic-1 on kafka-1... done\n'))
                  .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
      })
    })

    validDisable.forEach((value) => {
      it(`turns compaction off and uses current retention value if set with argument ${value}`, () => {
        kafka.get(topicListUrl('00000000-0000-0000-0000-000000000000'))
             .reply(200, { topics: [ { name: 'topic-1', retention_time_ms: 123, compaction: true } ] })
        kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                  { topic: { name: 'topic-1', compaction: false, retention_time_ms: 123 } })
             .reply(200)

        return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1', VALUE: value }})
                  .then(() => expect(cli.stderr).to.equal('Disabling compaction for topic topic-1 on kafka-1... done\n'))
                  .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
      })

      it(`turns compaction off and sets retention to plan minimum if unset with argument ${value}`, () => {
        kafka.get(topicListUrl('00000000-0000-0000-0000-000000000000'))
             .reply(200, { topics: [ { name: 'topic-1', compaction: true } ] })
        kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                  { topic: { name: 'topic-1', compaction: false, retention_time_ms: 20 } })
             .reply(200)

        return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1', VALUE: value }})
                  .then(() => expect(cli.stderr).to.equal('Disabling compaction and setting retention time to 20 milliseconds for topic topic-1 on kafka-1... done\n'))
                  .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
      })
    })
  })

  describe('if the cluster does not support a mixed cleanup policy', () => {
    beforeEach(() => {
      kafka.get(topicListUrl('00000000-0000-0000-0000-000000000000'))
           .reply(200, { topics: [ { name: 'topic-1', compaction: true } ] })
      kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
           .reply(200, {
             capabilities: { supports_mixed_cleanup_policy: false },
             limits: { minimum_retention_ms: 20 }
           })
    })

    validEnable.forEach((value) => {
      it(`turns off retention and turns compaction on with argument ${value}`, () => {
        kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                  { topic: { name: 'topic-1', compaction: true, retention_time_ms: null } })
             .reply(200)

        return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1', VALUE: value }})
                  .then(() => expect(cli.stderr).to.equal('Enabling compaction and disabling time-based retention for topic topic-1 on kafka-1... done\n'))
                  .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
      })
    })

    validDisable.forEach((value) => {
      it(`turns compaction off and sets retention to plan minimum with argument ${value}`, () => {
        kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
                  { topic: { name: 'topic-1', compaction: false, retention_time_ms: 20 } })
             .reply(200)

        return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1', VALUE: value }})
                  .then(() => expect(cli.stderr).to.equal('Disabling compaction and setting retention time to 20 milliseconds for topic topic-1 on kafka-1... done\n'))
                  .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
      })
    })
  })
})
