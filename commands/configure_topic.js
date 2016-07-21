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

function * configureTopic (context, heroku) {
  if (context.flags['no-compaction'] && context.flags['compaction']) {
    cli.error("can't pass both no-compaction and compaction")
    process.exit(1)
  } else if (context.args.CLUSTER) {
    process.stdout.write(`Configuring ${context.args.TOPIC} on ${context.args.CLUSTER}`)
  } else {
    process.stdout.write(`Configuring ${context.args.TOPIC}`)
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

  var creation = new HerokuKafkaClusters(heroku, process.env, context).configureTopic(context.args.CLUSTER, context.args.TOPIC, flags)
  yield printWaitingDots()

  var err = yield creation

  if (err) {
    process.stdout.write('\n')
    cli.error(err)
  } else {
    process.stdout.write(' done.\n')
    process.stdout.write(`Use \`heroku kafka:topic ${context.args.TOPIC}\` to monitor your topic.\n`)
  }
}

module.exports = {
  topic: 'kafka',
  command: 'configure',
  description: 'configures a topic in Kafka',
  help: `
    Configures a topic in Kafka.

    Examples:

  $ heroku kafka:configure page-visits --retention-time '1 day'
  $ heroku kafka:configure HEROKU_KAFKA_BROWN_URL page-visits --retention-time '1 day' --compaction
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'retention-time', description: 'length of time messages in the topic should be retained for', hasValue: true },
    { name: 'compaction', description: 'enables compaction on the topic if passed', hasValue: false },
    { name: 'no-compaction', description: 'disables compaction on the topic if passed', hasValue: false },
    {name: 'replication-factor', description: 'number of replicas each partition in the topic has', hasValue: true}
  ],
  run: cli.command(co.wrap(configureTopic))
}
