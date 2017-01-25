'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let clusterConfig = require('../lib/shared').clusterConfig

const VERSION = 'v0'

function * replicationFactor (context, heroku) {
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

    let msg = `Setting replication factor for topic ${topicName} to ${context.args.VALUE}`
    if (context.args.CLUSTER) {
      msg += ` on ${context.args.CLUSTER}`
    }

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'PUT',
        body: {
          topic: {
            name: topicName,
            replication_factor: context.args.VALUE
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
