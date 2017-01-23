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

const cmd = proxyquire('../../commands/topics_create', {
  '../lib/clusters': {
    withCluster
  }
}).cmd

describe('kafka:topics:create', () => {
  let kafka

  let createUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}/topics`
  }

  beforeEach(() => {
    kafka = nock('https://kafka-api.heroku.com:443')

    cli.exit.mock()
    cli.mockConsole()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('shows an error and exits with an invalid retention time', () => {
    return expectExit(1, cmd.run({app: 'myapp',
                                  args: { TOPIC: 'topic-1' },
                                  flags: { 'retention-time': '2 eons' }}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(` ▸    Could not parse retention time '2 eons'; expected value like '10d' or\n ▸    '36h'\n`))
  })

  it('passes the topic name and specified flags', () => {
    kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 10,
          replication_factor: '3',
          partition_count: '7',
          compaction: false
        }
      }).reply(200)

    return cmd.run({app: 'myapp',
                    args: { TOPIC: 'topic-1' },
                    flags: { 'replication-factor': '3',
                             'retention-time': '10ms',
                             'partitions': '7' }})
              .then(() => {
                expect(cli.stderr).to.equal('Creating topic topic-1... done\n')
                expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
              })
  })
})
