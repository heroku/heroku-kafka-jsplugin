'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let deprecated = require('../lib/shared').deprecated
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * listTopics (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let topics = yield request(heroku, {
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/topics`
    })

    cli.styledHeader('Kafka Topics on ' + (topics.attachment_name || 'HEROKU_KAFKA'))
    let topicData = topics.topics.filter((t) => t.name !== '__consumer_offsets')
    cli.log()
    if (topicData.length === 0) {
      cli.log('No topics found on this Kafka cluster.')
      cli.log('Use heroku kafka:topics:create to create a topic.')
    } else {
      cli.table(topicData,
        {
          columns: [
            {key: 'name', label: 'Name'},
            {key: 'messages', label: 'Messages'},
            {key: 'bytes', label: 'Traffic'}
          ]
        }
      )
    }
  })
}

let cmd = {
  topic: 'kafka',
  command: 'topics',
  description: 'lists available Kafka topics',
  help: `
    Lists available Kafka topics.

    Examples:

    $ heroku kafka:topics
    $ heroku kafka:topics HEROKU_KAFKA_BROWN_URL
`,

  args: [
    { name: 'CLUSTER', optional: true }
  ],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(listTopics))
}

module.exports = {
  cmd,
  deprecated: Object.assign({}, cmd, { command: 'list',
                                       hidden: true,
                                       run: cli.command(co.wrap(deprecated(listTopics, cmd.command))) })
}
