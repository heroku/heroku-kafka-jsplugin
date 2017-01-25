'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let clusterConfig = require('../lib/shared').clusterConfig

const VERSION = 'v0'

function * destroyConsumerGroup (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    yield cli.confirmApp(context.app, context.flags.confirm,
                         `This command will affect the cluster: ${addon.name}, which is on ${context.app}`)

    let appConfig = yield heroku.get(`/apps/${context.app}/config-vars`)
    let attachment = yield heroku.get(`/apps/${context.app}/addon-attachments/${addon.name}`)
    let config = clusterConfig(attachment, appConfig)

    var consumerGroupName = context.args.CONSUMER_GROUP
    var consumerGroupNameArray = consumerGroupName.split(/(\.)/g)
    var consumerGroupPrefix = consumerGroupNameArray[0] + consumerGroupNameArray[1]
    if (config.prefix && (config.prefix !== consumerGroupPrefix)) {
      consumerGroupName = `${config.prefix}${context.args.CONSUMER_GROUP}`
    }

    let msg = `Deleting consumer group ${consumerGroupName}`
    if (context.args.CLUSTER) {
      msg += ` on ${context.args.CLUSTER}`
    }

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'delete',
        body: {
          consumer_group: {
            name: consumerGroupName
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`
      })
    }))

    cli.log('Your consumer group has been deleted')
  })
}

module.exports = {
  hidden: true,
  topic: 'kafka',
  command: 'consumer-groups:destroy',
  description: 'destroys a consumer group in Kafka',
  help: `
    Destroys a consumer group in Kafka.

    Examples:

  $ heroku kafka:consumer-groups:destroy word-counters
  $ heroku kafka:consumer-groups:destroy word-counters kafka-aerodynamic-32763
  `,
  needsApp: true,
  needsAuth: true,
  flags: [
    { name: 'confirm',
      description: 'pass the app name to skip the manual confirmation prompt',
      hasValue: true }
  ],
  args: [
    { name: 'CONSUMER_GROUP' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, co.wrap(destroyConsumerGroup))
}
