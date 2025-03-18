'use strict'

let cli = require('@heroku/heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * listConsumerGroups (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let consumerGroups = yield request(heroku, {
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`
    })
    cli.styledHeader('Kafka Consumer Groups on ' + (context.args.CLUSTER || 'HEROKU_KAFKA'))
    let consumerGroupData = consumerGroups.consumer_groups.map((g) => {
      return {
        name: g.name
      }
    })
    cli.log()
    if (consumerGroupData.length === 0) {
      cli.log('No consumer groups found on this Kafka cluster.')
      cli.log('Use heroku kafka:consumer-groups:create to create a consumer group.')
    } else {
      cli.table(consumerGroupData,
        {
          columns: [
            {key: 'name', label: 'Name'}
          ]
        }
      )
    }
  })
}

module.exports = {
  topic: 'kafka',
  command: 'consumer-groups',
  description: 'lists available Kafka consumer groups',
  help: `
    Lists available Kafka consumer groups.

    Examples:

    $ heroku kafka:consumer-groups
    $ heroku kafka:consumer-groups kafka-aerodynamic-32763
`,

  args: [
    { name: 'CLUSTER', optional: true }
  ],
  needsApp: true,
  needsAuth: true,
  run: cli.command({preauth: true}, co.wrap(listConsumerGroups))
}
