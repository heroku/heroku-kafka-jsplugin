'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseDuration = require('../lib/shared').parseDuration
let deprecated = require('../lib/shared').deprecated
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let clusterConfig = require('../lib/shared').clusterConfig

const VERSION = 'v0'

function * createTopic (context, heroku) {
  var flags = Object.assign({}, context.flags)
  if ('retention-time' in flags) {
    let value = flags['retention-time']
    let parsed = parseDuration(value)
    if (parsed == null) {
      cli.exit(1, `Could not parse retention time '${value}'; expected value like '10d' or '36h'`)
    }
    flags['retention-time'] = parsed
  }

  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let appConfig = yield heroku.get(`/apps/${context.app}/config-vars`)
    let attachment = yield heroku.get(`/apps/${context.app}/addon-attachments/${addon.name}`)
    let config = clusterConfig(attachment, appConfig)

    var topicName = context.args.TOPIC
    var topicNameArray = topicName.split(/(\.)/g)
    var topicPrefix = topicNameArray[0] + topicNameArray[1]
    if (config.prefix && (config.prefix !== topicPrefix)) {
      topicName = `${config.prefix}${context.args.TOPIC}`
    }

    let msg = `Creating topic ${topicName}`
    if (context.args.CLUSTER) {
      msg += ` on ${context.args.CLUSTER}`
    }

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'POST',
        body: {
          topic: {
            name: topicName,
            retention_time_ms: flags['retention-time'],
            replication_factor: flags['replication-factor'],
            partition_count: flags['partitions'],
            compaction: flags['compaction'] || false
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics`
      })
    }))

    cli.log(`Use \`heroku kafka:topics:info topicName\` to monitor your topic.`)
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
