'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let deprecated = require('../lib/shared').deprecated
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * kafkaTopic (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    const topic = context.args.TOPIC

    let info = yield request(heroku, {
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/topics/${topic}`
    })

    cli.styledHeader((info.attachment_name || 'HEROKU_KAFKA') + ' :: ' + info.topic)
    cli.log()
    cli.styledNameValues(info.info)
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
  run: cli.command(co.wrap(kafkaTopic))
}

module.exports = {
  cmd,
  deprecated: Object.assign({}, cmd, { command: 'topic',
                                       hidden: true,
                                       run: cli.command(co.wrap(deprecated(kafkaTopic, cmd.command))) })
}
