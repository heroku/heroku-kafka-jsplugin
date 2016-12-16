'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseBool = require('../lib/shared').parseBool
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * compaction (context, heroku) {
  let cleanup_policy = context.args.VALUE

  let msg = `Setting cleanup-policy to ${cleanup_policy} for topic ${context.args.TOPIC}`
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
            cleanup_policy: cleanup_policy
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.name}/topics/${topicName}`
      })
    }))
    cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
  })
}

module.exports = {
  topic: 'kafka',
  command: 'topics:cleanup-policy',
  description: 'configures topic compaction in Kafka',
  help: `
    Configures the cleanup-policy in Kafka.

    Examples:

  $ heroku kafka:topics:cleanup-policy page-visits compact
  $ heroku kafka:topics:cleanup-policy page-visits delete HEROKU_KAFKA_BROWN_URL
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'VALUE' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, co.wrap(cleanup_policy))
}
