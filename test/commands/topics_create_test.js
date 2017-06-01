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

const Command = proxyquire('../../commands/topics_create', {
  '../lib/clusters': {
    withCluster
  }
}).cmd

describe('kafka:topics:create', () => {
  let kafka

  let createUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}/topics`
  }

  let infoUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}`
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

  it('shows an error and exits with an invalid retention time', async () => {
    let err
    try {
      await Command.mock('topic-1', '--app', 'myapp', '--retention-time', '2 eons')
    } catch (e) {
      err = e
    } finally {
      expect(err.message).to.equal(`Could not parse duration '2 eons'; expected value like '10d' or '36h'`)
    }
  })

  it('passes the topic name and specified flags', async () => {
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
         .reply(200, { shared_cluster: false })
    kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 10,
          replication_factor: 3,
          partition_count: 7,
          compaction: false
        }
      }).reply(200)

    await Command.mock('topic-1', '--app', 'myapp', '--replication-factor', '3', '--retention-time', '10ms', '--partitions', '7')
    expect(cli.stderr).to.equal('Creating topic topic-1 with compaction disabled and retention time 10 milliseconds on kafka-1... done\n')
    expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
  })

  it('defaults retention to the plan minimum if not specified even if retention specified', async () => {
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
         .reply(200, { shared_cluster: false, limits: { minimum_retention_ms: 66 } })
    kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 66,
          replication_factor: 3,
          partition_count: 7,
          compaction: false
        }
      }).reply(200)

    await Command.mock('topic-1', '--app', 'myapp', '--replication-factor', '3', '--partitions', '7')
    expect(cli.stderr).to.equal('Creating topic topic-1 with compaction disabled and retention time 66 milliseconds on kafka-1... done\n')
    expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
  })

  describe('for multi-tenant plans', () => {
    it('defaults retention to the plan minimum if not specified even if compaction specified', async () => {
      kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
           .reply(200, { shared_cluster: true, limits: { minimum_retention_ms: 66 } })
      kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
        {
          topic: {
            name: 'topic-1',
            retention_time_ms: 66,
            replication_factor: 3,
            partition_count: 7,
            compaction: true
          }
        }).reply(200)

      await Command.mock('topic-1', '--app', 'myapp', '--replication-factor', '3', '--partitions', '7', '--compaction')
      expect(cli.stderr).to.equal('Creating topic topic-1 with compaction enabled and retention time 66 milliseconds on kafka-1... done\n')
      expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
    })
  })
})
