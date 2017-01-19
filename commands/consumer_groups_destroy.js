'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * destroyConsumerGroup (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let msg = `Creating consumer group ${context.args.CONSUMER_GROUP}`
    if (context.args.CLUSTER) {
      msg += ` on ${context.args.CLUSTER}`
    }

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'delete',
        body: {
          consumer_group: {
            name: context.args.CONSUMER_GROUP
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
  args: [
    { name: 'CONSUMER_GROUP' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, co.wrap(destroyConsumerGroup))
}
