'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseBool = require('../lib/shared').parseBool
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let clusterConfig = require('../lib/shared').clusterConfig

const VERSION = 'v0'

function * compaction (context, heroku) {
  let enabled = parseBool(context.args.VALUE)
  if (enabled === undefined) {
    cli.exit(1, `Unknown value '${context.args.VALUE}': must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable`)
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

    let msg = `${enabled ? 'Enabling' : 'Disabling'} compaction for topic ${topicName}`
    if (context.args.CLUSTER) {
      msg += ` on ${context.args.CLUSTER}`
    }

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'PUT',
        body: {
          topic: {
            name: topicName,
            compaction: enabled
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`
      })
    }))
    cli.log(`Use \`heroku kafka:topics:info ${topicName}\` to monitor your topic.`)
  })
}

module.exports = {
  topic: 'kafka',
  command: 'topics:compaction',
  description: 'configures topic compaction in Kafka',
  help: `
    Enables or disables topic compaction in Kafka.

    Examples:

  $ heroku kafka:topics:compaction page-visits enable
  $ heroku kafka:topics:compaction page-visits disable HEROKU_KAFKA_BROWN_URL
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
