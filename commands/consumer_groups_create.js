'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * createConsumerGroup (context, heroku) {
  let addon = yield withCluster(heroku, context.app, context.args.CLUSTER)
  let msg = `Creating consumer group ${context.args.CONSUMER_GROUP}`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }
  var created = true

  yield cli.action(msg, co(function * () {
    return yield request(heroku, {
      method: 'POST',
      body: {
        consumer_group: {
          name: context.args.CONSUMER_GROUP
        }
      },
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`
    })
  })).catch(err => {
    if (err.statusCode === 400 && err.body.message === 'this command is not required or enabled on dedicated clusters') {
      created = false
      cli.warn(`${cli.color.addon(addon.name)} does not need consumer groups managed explicitly, so this command does nothing`)
    } else {
      throw err
    }
  })

  if (created === true) {
    cli.log('Use `heroku kafka:consumer-groups` to list your consumer groups.')
  }
}

module.exports = {
  topic: 'kafka',
  command: 'consumer-groups:create',
  description: 'creates a consumer group in Kafka',
  help: `
    Creates a consumer group in Kafka.

    Examples:

  $ heroku kafka:consumer-groups:create word-counters
  $ heroku kafka:consumer-groups:create word-counters kafka-aerodynamic-32763
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'CONSUMER_GROUP' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, co.wrap(createConsumerGroup))
}
