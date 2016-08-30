'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseBool = require('../lib/shared').parseBool
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * jmx (context, heroku) {
  let enabled = parseBool(context.args.VALUE)
  if (enabled === undefined) {
    cli.exit(1, `Unknown value '${context.args.VALUE}': must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable`)
  }

  let msg = `${enabled ? 'Enabling' : 'Disabling'} JMX access`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }

  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'POST',
        body: {
          enabled: enabled
        },
        path: `/client/kafka/${VERSION}/clusters/${addon.name}/jmx`
      })
    }))
  })
}

module.exports = {
  hidden: true,
  topic: 'kafka',
  command: 'jmx',
  description: 'enable or disable JMX access to your Kafka cluster',
  args: [
    { name: 'VALUE' },
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
