'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseDuration = require('../lib/shared').parseDuration
let deprecated = require('../lib/shared').deprecated
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let fetchProvisionedInfo = require('../lib/clusters').fetchProvisionedInfo

const VERSION = 'v0'

function * createTopic (context, heroku) {
  let flags = Object.assign({}, context.flags)
  let retentionTimeMillis
  if ('retention-time' in flags) {
    retentionTimeMillis = parseDuration(flags['retention-time'])
    if (retentionTimeMillis == null) {
      cli.exit(1, `Could not parse retention time '${flags['retention-time']}'; expected value like '10d' or '36h'`)
    }
  }

  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let msg = `Creating topic ${context.args.TOPIC}`
    if (context.args.CLUSTER) {
      msg += ` on ${context.args.CLUSTER}`
    }

    let addonInfo = yield fetchProvisionedInfo(heroku, addon)

    if (addonInfo.shared_cluster && retentionTimeMillis === undefined) {
      retentionTimeMillis = addonInfo.limits.minimum_retention_ms
    }

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'POST',
        body: {
          topic: {
            name: context.args.TOPIC,
            retention_time_ms: retentionTimeMillis,
            replication_factor: flags['replication-factor'],
            partition_count: flags['partitions'],
            compaction: flags['compaction'] || false
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics`
      })
    }))

    cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
  })
}

let cmd = {
  topic: 'kafka',
  command: 'topics:create',
  description: 'creates a topic in Kafka',
  help: `
    Creates a topic in Kafka.

    Examples:

  $ heroku kafka:topics:create page-visits --partitions 100
  $ heroku kafka:topics:create page-visits HEROKU_KAFKA_BROWN_URL --partitions 100 --replication-factor 3 --retention-time 10d
  $ heroku kafka:topics:create page-visits HEROKU_KAFKA_BROWN_URL --partitions 100 --compaction
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'partitions', description: 'number of partitions to give the topic', hasValue: true },
    { name: 'replication-factor', description: 'number of replicas the topic should be created across', hasValue: true },
    { name: 'retention-time', description: 'length of time messages in the topic should be retained (at least 24h)', hasValue: true },
    { name: 'compaction', description: 'whether to use compaction for this topic', hasValue: false }
  ],
  run: cli.command({preauth: true}, co.wrap(createTopic))
}

module.exports = {
  cmd,
  deprecated: Object.assign({}, cmd, { command: 'create',
                                       hidden: true,
                                       run: cli.command(co.wrap(deprecated(createTopic, cmd.command))) })
}
