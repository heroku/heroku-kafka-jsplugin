'use strict'

let cli = require('@heroku/heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function * fail (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    yield cli.confirmApp(context.app, context.flags.confirm,
      `This command will affect the cluster: ${addon.name}, which is on ${context.app}\n\nThis command will forcibly terminate nodes in your cluster at random.\nYou should only run this command in controlled testing scenarios.`)

    let response = yield cli.action('Triggering failure', co(function * () {
      return yield request(heroku, {
        method: 'POST',
        body: {
          catastrophic: context.flags.catastrophic,
          zookeeper: context.flags.zookeeper
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/induce-failure`
      })
    }))

    cli.log(response.message)
  })
}

module.exports = {
  topic: 'kafka',
  command: 'fail',
  description: 'triggers failure on one node in the cluster',
  help: `
    Triggers failure on one Kafka broker in the cluster by stopping the underlying
    instance and allowing Heroku automation to recover it.

    Examples:

    $ heroku kafka:fail
    $ heroku kafka:fail kafka-aerodynamic-32763
`,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'catastrophic',
      description: 'terminate the underlying instance instead and allow automation to replace it',
      hasValue: false },
    { name: 'zookeeper',
      description: 'induce failure on one of the cluster\'s Zookeeper nodes instead',
      hasValue: false },
    { name: 'confirm',
      description: 'pass the app name to skip the manual confirmation prompt',
      hasValue: true,
      required: false }
  ],
  run: cli.command({preauth: true}, co.wrap(fail))
}
