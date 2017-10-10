'use strict'
/* eslint standard/no-callback-literal: off, no-unused-expressions: off */

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

  it('shows an error and exits with an invalid retention time', () => {
    return expectExit(1, cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1' },
      flags: { 'retention-time': '2 eons' }}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(` ▸    Could not parse retention time '2 eons'; expected value like '10d' or\n ▸    '36h'\n`))
  })

  it('passes the topic name and specified flags', () => {
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, { shared_cluster: false })
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
        'partitions': '7' }}
    )
      .then(() => {
        expect(cli.stderr).to.equal('Creating topic topic-1 with compaction disabled and retention time 10 milliseconds on kafka-1... done\n')
        expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
      })
  })

  it('includes the topic prefix and link in output if one exists', () => {
    const prefix = 'mill-4567.'
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, { topic_prefix: prefix })
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
        'partitions': '7' }}
    )
      .then(() => {
        expect(cli.stderr).to.equal('Creating topic topic-1 with compaction disabled and retention time 10 milliseconds on kafka-1... done\n')
        expect(cli.stdout).to.equal(`Use \`heroku kafka:topics:info topic-1\` to monitor your topic.\nYour topic is using the prefix ${prefix}. Learn more in Dev Center:\n  https://devcenter.heroku.com/articles/multi-tenant-kafka-on-heroku#connecting-kafka-prefix\n`)
      })
  })

  it('defaults retention to the plan minimum if not specified even if retention specified', () => {
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, { shared_cluster: false, limits: { minimum_retention_ms: 66 } })
    kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 66,
          replication_factor: '3',
          partition_count: '7',
          compaction: false
        }
      }).reply(200)

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1' },
      flags: { 'replication-factor': '3',
        'partitions': '7' }}
    )
      .then(() => {
        expect(cli.stderr).to.equal('Creating topic topic-1 with compaction disabled and retention time 66 milliseconds on kafka-1... done\n')
        expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
      })
  })

  describe('for multi-tenant plans', () => {
    it('defaults retention to the plan minimum if not specified even if compaction specified', () => {
      kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
        .reply(200, { shared_cluster: true, limits: { minimum_retention_ms: 66 } })
      kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
        {
          topic: {
            name: 'topic-1',
            retention_time_ms: 66,
            replication_factor: '3',
            partition_count: '7',
            compaction: true
          }
        }).reply(200)

      return cmd.run({app: 'myapp',
        args: { TOPIC: 'topic-1' },
        flags: { 'replication-factor': '3',
          'partitions': '7',
          'compaction': true }}
      )
        .then(() => {
          expect(cli.stderr).to.equal('Creating topic topic-1 with compaction enabled and retention time 66 milliseconds on kafka-1... done\n')
          expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
        })
    })
  })
})
