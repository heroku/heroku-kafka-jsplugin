'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let parseBool = require('../lib/shared').parseBool
let isPrivate = require('../lib/shared').isPrivate
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * zookeeper (context, heroku) {
  let enabled = parseBool(context.args.VALUE)
  if (enabled === undefined) {
    cli.exit(1, `Unknown value '${context.args.VALUE}': must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable`)
  }

  let msg = `${enabled ? 'Enabling' : 'Disabling'} Zookeeper access`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }

  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    if (!isPrivate(addon)) {
      cli.exit(1, '`kafka:zookeeper` is only available in Heroku Private Spaces')
    }

    yield cli.action(msg, co(function * () {
      return yield request(heroku, {
        method: 'POST',
        body: {
          enabled: enabled
        },
        path: `/client/kafka/${VERSION}/clusters/${addon.name}/zookeeper`
      })
    }))
  })
}

module.exports = {
  topic: 'kafka',
  command: 'zookeeper',
  description: '(Private Spaces only) control direct access to Zookeeper of your Kafka cluster',
  args: [
    { name: 'VALUE' },
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Enables or disables Zookeeper access to your Kafka cluster. Note:
    Zookeeper access is only available in Heroku Private Spaces.

    Examples:

    $ heroku kafka:zookeeper enable
    $ heroku kafka:zookeeper disable HEROKU_KAFKA_BROWN_URL

  To check the Zookeeper status of the cluster, see

    $ heroku kafka:info
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(zookeeper))
}
