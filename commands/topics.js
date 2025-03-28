'use strict'

let cli = require('@heroku/heroku-cli-util')
let co = require('co')
let humanize = require('humanize-plus')
let deprecated = require('../lib/shared').deprecated
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * listTopics (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let topics = yield request(heroku, {
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics`
    })
    cli.styledHeader('Kafka Topics on ' + (topics.attachment_name || 'HEROKU_KAFKA'))

    if (topics.topics.length !== 0) {
      const extraInfo = []
      if (topics.limits && topics.limits.max_topics) {
        extraInfo.push(`${topics.topics.length} / ${topics.limits.max_topics} topics`)
      }
      if (topics.prefix) {
        extraInfo.push(`prefix: ${cli.color.green(topics.prefix)}`)
      }
      if (extraInfo.length > 0) {
        cli.log(extraInfo.join('; '))
      }
    }

    let filtered = topics.topics.filter((t) => t.name !== '__consumer_offsets')
    let topicData = filtered.map((t) => {
      return {
        name: t.name,
        messages: `${humanize.intComma(t.messages_in_per_second)}/sec`,
        bytes: `${humanize.fileSize(t.bytes_in_per_second)}/sec`
      }
    })
    cli.log()
    if (topicData.length === 0) {
      cli.log('No topics found on this Kafka cluster.')

      if (topics.limits && topics.limits.max_topics) {
        cli.log(`Use heroku kafka:topics:create to create a topic (limit ${topics.limits.max_topics}).`)
      } else {
        cli.log('Use heroku kafka:topics:create to create a topic.')
      }
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

    Note that some plans use a topic prefix; to learn more,
    visit https://devcenter.heroku.com/articles/multi-tenant-kafka-on-heroku#connecting-kafka-prefix

    Examples:

    $ heroku kafka:topics
    $ heroku kafka:topics HEROKU_KAFKA_BROWN_URL
`,

  args: [
    { name: 'CLUSTER', optional: true }
  ],
  needsApp: true,
  needsAuth: true,
  run: cli.command({preauth: true}, co.wrap(listTopics))
}

module.exports = {
  cmd,
  deprecated: Object.assign({}, cmd, { command: 'list',
    hidden: true,
    run: cli.command(co.wrap(deprecated(listTopics, cmd.command))) })
}
