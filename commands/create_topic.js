'use strict'

let DOT_WAITING_TIME = 200

let cli = require('heroku-cli-util')
let co = require('co')
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters
let parseDuration = require('./shared').parseDuration
let sleep = require('co-sleep')

function * printWaitingDots () {
  yield sleep(DOT_WAITING_TIME)
  process.stdout.write('.')
  yield sleep(DOT_WAITING_TIME)
  process.stdout.write('.')
  yield sleep(DOT_WAITING_TIME)
  process.stdout.write('.')
}

function * createTopic (context, heroku) {
  var clusters = new HerokuKafkaClusters(heroku, process.env, context)
  var addon = yield clusters.addonForSingleClusterCommand(context.args.CLUSTER)
  if (addon) {
    if (context.flags['replication-factor'] === '1') {
      yield cli.confirmApp(context.app, context.flags.confirm, `This command will create a topic with no replication on the cluster: ${addon.name}, which is on ${context.app}.\nData written to this topic will be lost if any single broker suffers catastrophic failure.`)

      cli.warn('Proceeding to create a non-replicated topic...')
    }
    yield doCreation(context, heroku, clusters)
  } else {
    process.exit(1)
  }
}

function * doCreation (context, heroku, clusters) {
  if (context.args.CLUSTER) {
    process.stdout.write(`Creating ${context.args.TOPIC} on ${context.args.CLUSTER}`)
  } else {
    process.stdout.write(`Creating ${context.args.TOPIC}`)
  }
  var flags = Object.assign({}, context.flags)
  if ('retention-time' in flags) {
    let value = flags['retention-time']
    let parsed = parseDuration(value)
    if (parsed == null) {
      cli.error(`could not parse retention time '${value}'`)
      process.exit(1)
    }
    flags['retention-time'] = parsed
  }

  var creation = clusters.createTopic(context.args.CLUSTER, context.args.TOPIC, flags)
  yield printWaitingDots()

  var err = yield creation

  if (err) {
    process.stdout.write('\n')
    cli.error(err)
    process.exit(1)
  } else {
    process.stdout.write(' done.\n')
    process.stdout.write(`Use \`heroku kafka:topic ${context.args.TOPIC}\` to monitor your topic.\n`)
  }
}

module.exports = {
  topic: 'kafka',
  command: 'create',
  description: 'creates a topic in Kafka',
  help: `
    Creates a topic in Kafka.

    Examples:

  $ heroku kafka:create page-visits --partitions 100
  $ heroku kafka:create HEROKU_KAFKA_BROWN_URL page-visits --partitions 100 --replication-factor 3 --retention-time '1 day' --compaction
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'partitions', description: 'number of partitions to give the topic', hasValue: true, required: true },
    { name: 'replication-factor', description: 'number of replicas the topic should be created across', hasValue: true },
    { name: 'retention-time', description: 'length of time messages in the topic should be retained for', hasValue: true },
    { name: 'compaction', description: 'whether to use compaction for this topic', hasValue: false },
    { name: 'confirm',
      description: 'pass the app name to skip the manual confirmation prompt',
      hasValue: true, required: false }
  ],
  run: cli.command(co.wrap(createTopic))
}
