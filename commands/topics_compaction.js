'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseBool = require('../lib/shared').parseBool
let formatIntervalFromMilliseconds = require('../lib/shared').formatIntervalFromMilliseconds
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let topicConfig = require('../lib/clusters').topicConfig
let fetchProvisionedInfo = require('../lib/clusters').fetchProvisionedInfo

const VERSION = 'v0'

function * compaction (context, heroku) {
  let enabled = parseBool(context.args.VALUE)
  if (enabled === undefined) {
    cli.exit(1, `Unknown value '${context.args.VALUE}': must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable`)
  }

  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    const topicName = context.args.TOPIC
    let [ topicInfo, addonInfo ] = yield [
      topicConfig(heroku, addon.id, topicName),
      fetchProvisionedInfo(heroku, addon)
    ]
    let retentionTime
    if (enabled) {
      retentionTime = addonInfo.capabilities.supports_mixed_cleanup_policy ? topicInfo.retention_time_ms : null
    } else {
      retentionTime = topicInfo.retention_time_ms || addonInfo.limits.minimum_retention_ms
    }
    let cleanupPolicy = {
      compaction: enabled,
      retention_time_ms: retentionTime
    }

    let msg = `${enabled ? 'Enabling' : 'Disabling'} compaction`
    if (enabled && !addonInfo.capabilities.supports_mixed_cleanup_policy) {
      msg += ' and disabling time-based retention'
    } else if (cleanupPolicy.retention_time_ms !== topicInfo.retention_time_ms) {
      msg += ` and setting retention time to ${formatIntervalFromMilliseconds(retentionTime)}`
    }
    msg += ` for topic ${context.args.TOPIC} on ${addon.name}`

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
  command: 'topics:compaction',
  description: 'configures topic compaction in Kafka',
  help: `
    Enables or disables topic compaction in Kafka. If compaction is enabled on an add-on that
    does not support compaction and time-based retention together, time-based retention is
    automatically turned off. If compaction is disabled, time-based retention is required:
    it is automatically set to the plan minimum.

    Examples:

  $ heroku kafka:topics:compaction page-visits enable
  $ heroku kafka:topics:compaction page-visits disable kafka-shiny-2345
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'VALUE' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, co.wrap(compaction))
}
