'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters

function * kafkaInfo (context, heroku) {
  var infos = yield new HerokuKafkaClusters(heroku, process.env, context).info(context.args.CLUSTER)
  if (infos.length !== 0) {
    infos.forEach(function (info) {
      cli.styledHeader(info.attachment_name || 'HEROKU_KAFKA')
      console.log()
      cli.styledNameValues(info.info)
    })
  } else {
    process.exit(1)
  }
}

module.exports = {
  topic: 'kafka',
  command: 'info',
  default: true,
  description: 'shows information about the state of your Kafka cluster',
  args: [
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Shows information about the state of your Heroku Kafka cluster.

    Examples:

    $ heroku kafka:info
    $ heroku kafka:info HEROKU_KAFKA_BROWN_URL

    To get started with Heroku Kafka:

    $ heroku addons:create heroku-kafka
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaInfo))
}
