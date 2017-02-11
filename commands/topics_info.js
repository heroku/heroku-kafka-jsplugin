'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let humanize = require('humanize-plus')
let deprecated = require('../lib/shared').deprecated
let withCluster = require('../lib/clusters').withCluster
let topicConfig = require('../lib/clusters').topicConfig

const ONE_HOUR_IN_MS = 60 * 60 * 1000
const TWENTY_FOUR_HOURS_IN_MS = ONE_HOUR_IN_MS * 24
const TWO_DAYS_IN_MS = TWENTY_FOUR_HOURS_IN_MS * 2

function retention (retentionTimeMs) {
  if (retentionTimeMs < ONE_HOUR_IN_MS) {
    return `${Math.round(retentionTimeMs / 1000.0)} seconds`
  } else if (retentionTimeMs < TWO_DAYS_IN_MS) {
    return `${Math.round(retentionTimeMs / ONE_HOUR_IN_MS)} hours`
  } else {
    return `${Math.round(retentionTimeMs / TWENTY_FOUR_HOURS_IN_MS)} days`
  }
}

function topicInfo (topic) {
  let lines = [
    {
      name: 'Producers',
      values: [`${humanize.intComma(topic.messages_in_per_second)} ${humanize.pluralize(topic.messages_in_per_second, 'message')}/second (${humanize.fileSize(topic.bytes_in_per_second)}/second) total`]
    },
    {
      name: 'Consumers',
      values: [`${humanize.fileSize(topic.bytes_out_per_second)}/second total`]
    },
    {
      name: 'Partitions',
      values: [`${topic.partitions} ${humanize.pluralize(topic.partitions, 'partition')}`]
    },
    {
      name: 'Replication Factor',
      values: [`${topic.replication_factor}`]
    }
  ]

  if (topic.compaction_enabled) {
    lines.push({
      name: 'Compaction',
      values: [`Compaction is enabled for ${topic.name}`]
    })
  } else {
    lines.push({
      name: 'Compaction',
      values: [`Compaction is disabled for ${topic.name}`]
    })
  }
  if (topic.retention_enabled) {
    lines.push({
      name: 'Retention',
      values: [retention(topic.retention_time_ms)]
    })
  }

  return lines
}

function * kafkaTopic (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let topicName = context.args.TOPIC
    let topic = yield topicConfig(heroku, addon.id, topicName)
    if (topic.partitions < 1) {
      cli.exit(1, `topic ${topicName} is not available yet`)
    } else {
      cli.styledHeader(addon.name + ' :: ' + topicName)
      cli.log()
      cli.styledNameValues(topicInfo(topic))
    }
  })
}

let cmd = {
  topic: 'kafka',
  command: 'topics:info',
  description: 'shows information about a topic in Kafka',
  args: [
    { name: 'TOPIC' },
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Shows information about a topic in your Kafka cluster

    Examples:

    $ heroku kafka:topics:info page-visits
    $ heroku kafka:topics:info page-visits HEROKU_KAFKA_BROWN_URL
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command({preauth: true}, co.wrap(kafkaTopic))
}

module.exports = {
  cmd,
  deprecated: Object.assign({}, cmd, { command: 'topic',
                                       hidden: true,
                                       run: cli.command(co.wrap(deprecated(kafkaTopic, cmd.command))) })
}
