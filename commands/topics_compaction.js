'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseBool = require('../lib/shared').parseBool
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * compaction (context, heroku) {
  let enabled = parseBool(context.args.VALUE)
  if (enabled === undefined) {
    cli.exit(1, `Unknown value '${context.args.VALUE}': must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable`)
  }

  let msg = `${enabled ? 'Enabling' : 'Disabling'} compaction for topic ${context.args.TOPIC}`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    yield cli.action(msg, co(function * () {
      const topicName = context.args.TOPIC
      return yield request(heroku, {
        method: 'PUT',
        body: {
          topic: {
            name: topicName,
            compaction: enabled
          }
        },
        path: `/client/kafka/${VERSION}/clusters/${addon.name}/topics/${topicName}`
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
  run: cli.command(co.wrap(compaction))
}
