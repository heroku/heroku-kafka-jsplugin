'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters

function * jmx (context, heroku) {
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

  yield new HerokuKafkaClusters(heroku, process.env, context).setJMX(context.args.CLUSTER, enabled)

  console.log(`JMX ${enabled ? 'enabled' : 'disabled'}`)
}

module.exports = {
  topic: 'kafka',
  command: 'jmx',
  description: 'enable or disable JMX access to your Kafka cluster',
  args: [
    { name: 'STATE' },
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Enables or disables JMX access to your Kafka cluster. Note that
    the JMX access available is read-only.

    Examples:

    $ heroku kafka:jmx on
    $ heroku kafka:jmx HEROKU_KAFKA_BROWN_URL off

  To check the JMX status of the cluster, see

    $ heroku kafka:info
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(jmx))
}
