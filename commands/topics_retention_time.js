'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseDuration = require('../lib/shared').parseDuration
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * retentionTime (context, heroku) {
  let parsed = parseDuration(context.args.VALUE)
  if (parsed == null) {
    cli.exit(1, `Unknown retention time '${context.args.VALUE}'; expected value like '36h' or '10d'`)
  }

  let msg = `Setting retention time for topic ${context.args.TOPIC} to ${context.args.VALUE}`
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
            retention_time_ms: parsed
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
  command: 'topics:retention-time',
  description: 'configures topic retention time (e.g. 10d, 36h)',
  help: `
    Configures topic retention time in Kafka.

    Examples:

  $ heroku kafka:topics:retention-time page-visits 10d
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
