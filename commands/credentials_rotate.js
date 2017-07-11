'use strict'

let cli = require('heroku-cli-util')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

async function credentialsRotate (context, heroku) {
  let addon = await withCluster(heroku, context.app, context.args.CLUSTER)
  let response = await request(heroku, {
    method: 'POST',
    path: `/data/kafka/${VERSION}/clusters/${addon.id}/rotate-credentials`
  })

  cli.log(response.message)
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
  run: cli.command({preauth: true}, credentialsRotate)
}
