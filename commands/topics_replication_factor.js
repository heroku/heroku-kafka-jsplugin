'use strict'

let cli = require('@heroku/heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let topicConfig = require('../lib/clusters').topicConfig

const VERSION = 'v0'

function * replicationFactor (context, heroku) {
  let msg = `Setting replication factor for topic ${context.args.TOPIC} to ${context.args.VALUE}`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    const topicName = context.args.TOPIC

    let topicInfo = yield topicConfig(heroku, addon.id, topicName)

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'PUT',
        body: {
          topic: {
            name: topicName,
            replication_factor: context.args.VALUE,
            retention_time_ms: topicInfo.retention_time_ms,
            compaction: topicInfo.compaction
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`
      })
    }))
    cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
  })
}

module.exports = {
  topic: 'kafka',
  command: 'topics:replication-factor',
  description: 'configures topic replication factor in Kafka',
  help: `
    Configures topic replication factor in Kafka.

    Examples:

  $ heroku kafka:topics:replication-factor page-visits 3
  $ heroku kafka:topics:replication-factor page-visits 3 HEROKU_KAFKA_BROWN_URL
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'VALUE' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, co.wrap(replicationFactor))
}
