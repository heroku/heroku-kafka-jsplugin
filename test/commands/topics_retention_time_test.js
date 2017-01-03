'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.beforeEach
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
        .then(() => expect(cli.stderr).to.equal(` ▸    Unknown retention time '1 fortnight'; expected value like '36h' or '10d'\n`))
    })
  })

  it('sets retention time to the specified value', () => {
    kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
              { topic: { name: 'topic-1', retention_time_ms: 60000 } }).reply(200)

    return cmd.run({app: 'myapp',
                    args: { TOPIC: 'topic-1', VALUE: '60s' },
                    flags: {}})
              .then(() => expect(cli.stderr).to.equal('Setting retention time for topic topic-1 to 60s... done\n'))
              .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
  })
})
