'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * credentialsRotate (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let response = yield request(heroku, {
      method: 'POST',
      path: `/client/kafka/${VERSION}/clusters/${addon.id}/rotate-credentials`
    })

    cli.log(response.message)
  })
}

module.exports = {
  topic: 'kafka',
  command: 'credentials',
  description: 'triggers credential rotation',
  help: `
    Rotates client certificates

    Examples:

    $ heroku kafka:credentials --reset
    $ heroku kafka:credentials KAFKA_RED_URL --reset
`,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'reset',
      description: 'reset credentials',
      hasValue: false,
      required: true }
  ],
  run: cli.command({preauth: true}, co.wrap(credentialsRotate))
}
