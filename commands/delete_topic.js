'use strict'

let DOT_WAITING_TIME = 200

let cli = require('heroku-cli-util')
let co = require('co')
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters
let sleep = require('co-sleep')

function * printWaitingDots () {
  yield sleep(DOT_WAITING_TIME)
  process.stdout.write('.')
  yield sleep(DOT_WAITING_TIME)
  process.stdout.write('.')
  yield sleep(DOT_WAITING_TIME)
  process.stdout.write('.')
}

function * doDeletion (context, heroku, clusters) {
  var deletion = clusters.deleteTopic(context.args.CLUSTER, context.args.TOPIC)
  process.stdout.write(`Deleting topic ${context.args.TOPIC}`)
  yield printWaitingDots()

  var err = yield deletion
  if (err) {
    process.stdout.write('\n')
    cli.error(err)
    process.exit(1)
  } else {
    process.stdout.write(' done.\n')
    console.log('Your topic has been marked for deletion, and will be removed from the cluster shortly')
    process.exit(0)
  }
}

function * deleteTopic (context, heroku) {
  var clusters = new HerokuKafkaClusters(heroku, process.env, context)
  var addon = yield clusters.addonForSingleClusterCommand(context.args.CLUSTER)
  if (addon) {
    yield cli.confirmApp(context.app, context.flags.confirm,
      `This command will affect the cluster: ${addon.name}, which is on ${context.app}`)

    yield doDeletion(context, heroku, clusters)
  } else {
    process.exit(1)
  }
}

module.exports = {
  topic: 'kafka',
  command: 'delete',
  description: 'deletes a topic in Kafka',
  help: `
    Deletes a topic in Kafka.
    Note that topics are deleted asynchronously, so even though this command has returned,
    a topic may still exist.

    Examples:

    $ heroku kafka:delete page-visits
    $ heroku kafka:delete HEROKU_KAFKA_BROWN_URL page-visits
`,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'confirm',
      description: 'pass the app name to skip the manual confirmation prompt',
      hasValue: true, required: false }
  ],
  run: cli.command(co.wrap(deleteTopic))
}
