'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseDuration = require('../lib/shared').parseDuration
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let topicConfig = require('../lib/clusters').topicConfig
let fetchProvisionedInfo = require('../lib/clusters').fetchProvisionedInfo

const VERSION = 'v0'

function * retentionTime (context, heroku) {
  let parsed
  if (context.args.VALUE === 'disable') {
    parsed = null
  } else {
    parsed = parseDuration(context.args.VALUE)
    if (parsed == null) {
      cli.exit(1, `Unknown retention time '${context.args.VALUE}'; expected 'disable' or value like '36h' or '10d'`)
    }
  }

  let msg = `Setting retention time for topic ${context.args.TOPIC} to ${context.args.VALUE}`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    const topicName = context.args.TOPIC
    let [ topicInfo, addonInfo ] = yield [
      topicConfig(heroku, addon.id, topicName),
      fetchProvisionedInfo(heroku, addon)
    ]
    let cleanupPolicy = {
      retention_time_ms: parsed,
      compaction: (!parsed || (addonInfo.capabilities.supports_mixed_cleanup_policy && topicInfo.compaction))
    }

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'PUT',
        body: {
          topic: Object.assign({ name: topicName }, cleanupPolicy)
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`
      })
    }))

    cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
  })
}

module.exports = {
  topic: 'kafka',
  command: 'topics:retention-time',
  description: 'configures or disables topic retention time (e.g. 10d, 36h)',
  help: `
    Configures or disables topic retention time in Kafka. If disabling, compaction is
    required and is automatically turned on. If time-based retention is enabled on an
    add-on that does not support compaction and time-based retention together, compaction
    is automatically turned off. Time-based retention cannot be disabled on multi-tenant plans.

    Examples:

  $ heroku kafka:topics:retention-time page-visits 10d
  $ heroku kafka:topics:retention-time page-visits disable
  $ heroku kafka:topics:retention-time page-visits 36h HEROKU_KAFKA_BROWN_URL
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'VALUE' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, co.wrap(retentionTime))
}
