'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters

function * zookeeper (context, heroku) {
  let enabled
  switch (context.args.state) {
    case 'yes':
    case 'true':
    case 'on':
    case 'enable':
      enabled = true
      break
    case 'no':
    case 'false':
    case 'off':
    case 'disable':
      enabled = false
      break
  }
  if (enabled === undefined) {
    cli.error(`unrecognized state '${context.args.STATE}': must be one of 'yes', 'true', 'on', or 'enable' to turn on, or 'no', 'false', 'off', or 'disable' to turn off`)
    process.exit(1)
  }

  yield new HerokuKafkaClusters(heroku, process.env, context).setZookeeper(context.args.CLUSTER, enabled)

  console.log(`Zookeeper access ${enabled ? 'enabled' : 'disabled'}`)
}

module.exports = {
  topic: 'kafka',
  command: 'zookeeper',
  description: 'enable or disable Zookeeper access to your Kafka cluster',
  args: [
    { name: 'STATE' },
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Enables or disables Zookeeper access to your Kafka cluster. Note that
    the Zookeeper access is only available in Heroku Private Spaces.

    Examples:

    $ heroku kafka:zookeeper on
    $ heroku kafka:zookeeper HEROKU_KAFKA_BROWN_URL off

  To check the Zookeeper status of the cluster, see

    $ heroku kafka:info
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(zookeeper))
}
