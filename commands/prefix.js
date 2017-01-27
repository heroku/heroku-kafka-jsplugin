'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * kafkaPrefix (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let info = yield request(heroku, {
      path: `/data/kafka/${VERSION}/clusters/${addon.id}`
    })

    if (info.topic_prefix) {
      cli.log(info.topic_prefix)
    } else {
      cli.log('No prefix found.')
    }
  })
}

module.exports = {
  topic: 'kafka',
  command: 'prefix',
  description: 'display user prefix',
  help: `
    Displays user prefix.

    Examples:

    $ heroku kafka:prefix
    $ heroku kafka:prefix HEROKU_KAFKA_BROWN_URL
`,
  needsApp: true,
  needsAuth: true,
  args: [{name: 'CLUSTER', optional: true}],
  run: cli.command({preauth: true}, co.wrap(kafkaPrefix))
}
