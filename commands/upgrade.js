'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * upgradeCluster (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    yield cli.confirmApp(context.app, context.flags.confirm,
      `This command will upgrade the brokers of the cluster to version ${context.flags.version}.
                          Upgrading the cluster involves rolling restarts of brokers, and takes some time, depending on the
                          size of the cluster.`)

    let msg = 'Upgrading '
    if (context.args.CLUSTER) {
      msg += context.args.CLUSTER + ' '
    }
    msg += `to version ${context.flags.version}`

    cli.action.start(msg)

    yield request(heroku, {
      method: 'PUT',
      body: {
        version: context.flags.version
      },
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/upgrade`
    })

    cli.action.done('started.\n\n')

    cli.log('Use `heroku kafka:wait` to monitor the upgrade.')
  })
}

module.exports = {
  topic: 'kafka',
  command: 'upgrade',
  description: 'upgrades kafka broker version',
  help: `
    Upgrades the version running on the brokers

    Example:

  $ heroku kafka:upgrade --version 0.9
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'version', description: 'requested kafka version for upgrade', hasValue: true, required: true },
    { name: 'confirm', description: 'pass the app name to skip the manual confirmation prompt', hasValue: true }
  ],
  run: cli.command({preauth: true}, co.wrap(upgradeCluster))
}
