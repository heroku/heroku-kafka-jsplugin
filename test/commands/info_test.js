'use strict'
/* eslint standard/no-callback-literal: off, no-unused-expressions: off */

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const proxyquire = require('proxyquire')

const cli = require('heroku-cli-util')
const nock = require('nock')

let addon
let all = [
  {name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: {name: 'heroku-kafka:beta-3'}},
  {name: 'kafka-2', id: '00000000-0000-0000-0000-000000000001', plan: {name: 'heroku-kafka:beta-3'}}
]

const fetcher = () => {
  return {
    all: () => all,
    addon: () => addon
  }
}

const cmd = proxyquire('../../commands/info', {
  '../lib/fetcher': fetcher
}).info

describe('kafka:info', () => {
  let api, kafka

  let infoUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}`
  }

  beforeEach(() => {
    api = nock('https://api.heroku.com:443')
    kafka = nock('https://kafka-api.heroku.com:443')
    cli.mockConsole()
  })

  afterEach(() => {
    nock.cleanAll()
    api.done()
    kafka.done()
  })

  describe('with 0 dbs', () => {
    it('shows empty state', () => {
      all = []

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal('myapp has no heroku-kafka clusters.\n'))
        .then(() => expect(cli.stderr).to.be.empty)
    })
  })

  describe('with 2 dbs', () => {
    let plan = {name: 'heroku-kafka:beta-3'}
    let attachments = [
      { addon: { name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' }, name: 'KAFKA' },
      { addon: { name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' }, name: 'HEROKU_KAFKA_COBALT' },
      { addon: { name: 'kafka-2', id: '00000000-0000-0000-0000-000000000001' }, name: 'HEROKU_KAFKA_PURPLE' }
    ]
    let addonService = {name: 'heroku-kafka'}
    let addons = [
      {name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', addon_service: addonService, plan},
      {name: 'kafka-2', id: '00000000-0000-0000-0000-000000000001', addon_service: addonService, plan}
    ]
    let clusterA = {
      addon: { name: 'kafka-1' },
      state: { message: 'available' },
      robot: { is_robot: false },
      topics: ['__consumer_offsets', 'messages'],
      limits: {},
      partition_replica_count: 132,
      messages_in_per_sec: 0,
      bytes_in_per_sec: 0,
      bytes_out_per_sec: 0,
      version: ['0.10.0.0'],
      created_at: '2016-11-14T14:26:20.245+00:00'
    }
    let clusterB = {
      addon: { name: 'kafka-2' },
      state: { message: 'available' },
      robot: { is_robot: false },
      topics: ['__consumer_offsets', 'messages'],
      limits: {max_topics: 10, max_partition_replica_count: 32},
      partition_replica_count: 12,
      messages_in_per_sec: 0,
      bytes_in_per_sec: 0,
      bytes_out_per_sec: 0,
      version: ['0.10.0.0'],
      created_at: '2016-11-14T14:26:20.245+00:00'
    }

    it('shows kafka info', () => {
      all = addons

      api.get('/apps/myapp/addon-attachments').reply(200, attachments)
      kafka
        .get(infoUrl('00000000-0000-0000-0000-000000000000')).reply(200, clusterA)
        .get(infoUrl('00000000-0000-0000-0000-000000000001')).reply(200, clusterB)

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stderr).to.be.empty)
        .then(() => expect(cli.stdout).to.equal(`=== KAFKA_URL, HEROKU_KAFKA_COBALT_URL
Plan:     heroku-kafka:beta-3
Status:   available
Version:  0.10.0.0
Created:  2016-11-14T14:26:20.245+00:00
Topics:   1 topic, see heroku kafka:topics
Messages: 0 messages/s
Traffic:  0 bytes/s in / 0 bytes/s out
Add-on:   kafka-1

=== HEROKU_KAFKA_PURPLE_URL
Plan:       heroku-kafka:beta-3
Status:     available
Version:    0.10.0.0
Created:    2016-11-14T14:26:20.245+00:00
Topics:     [█·········] 1 / 10 topics, see heroku kafka:topics
Partitions: [███·······] 12 / 32 partition replicas (partitions × replication factor)
Messages:   0 messages/s
Traffic:    0 bytes/s in / 0 bytes/s out
Add-on:     kafka-2

`))
    })

    it('shows kafka info for single cluster when arg sent in', () => {
      addon = addons[1]
      api.get('/apps/myapp/addon-attachments').reply(200, attachments)

      kafka
        .get(infoUrl('00000000-0000-0000-0000-000000000001'))
        .reply(200, clusterB)

      return cmd.run({app: 'myapp', args: {CLUSTER: 'kafka-2'}})
        .then(() => expect(cli.stderr).to.be.empty)
        .then(() => expect(cli.stdout).to.equal(`=== HEROKU_KAFKA_PURPLE_URL
Plan:       heroku-kafka:beta-3
Status:     available
Version:    0.10.0.0
Created:    2016-11-14T14:26:20.245+00:00
Topics:     [█·········] 1 / 10 topics, see heroku kafka:topics
Partitions: [███·······] 12 / 32 partition replicas (partitions × replication factor)
Messages:   0 messages/s
Traffic:    0 bytes/s in / 0 bytes/s out
Add-on:     kafka-2

`))
    })

    it('shows warning for 404', () => {
      all = addons

      api.get('/apps/myapp/addon-attachments').reply(200, attachments)
      kafka
        .get(infoUrl('00000000-0000-0000-0000-000000000000')).reply(404)
        .get(infoUrl('00000000-0000-0000-0000-000000000001')).reply(200, clusterB)

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== HEROKU_KAFKA_PURPLE_URL
Plan:       heroku-kafka:beta-3
Status:     available
Version:    0.10.0.0
Created:    2016-11-14T14:26:20.245+00:00
Topics:     [█·········] 1 / 10 topics, see heroku kafka:topics
Partitions: [███·······] 12 / 32 partition replicas (partitions × replication factor)
Messages:   0 messages/s
Traffic:    0 bytes/s in / 0 bytes/s out
Add-on:     kafka-2

`))
        .then(() => expect(cli.stderr).to.equal(` ▸    kafka-1 is not yet provisioned.
 ▸    Run heroku kafka:wait to wait until the cluster is provisioned.
`))
    })
  })
})
