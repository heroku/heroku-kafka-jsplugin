'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let HerokuKafkaClusters = require('../lib/clusters').HerokuKafkaClusters
let parseDuration = require('../lib/shared').parseDuration

function * configureTopic (context, heroku) {
  cli.warn('WARNING: kafka:configure is deprecated and will be removed in a future version; use kafka:topics:compaction, kafka:topics:retention-time, or kafka:topics:replication-factor instead')

  if (context.flags['no-compaction'] && context.flags['compaction']) {
    cli.exit(1, "can't pass both no-compaction and compaction")
  }

  var flags = Object.assign({}, context.flags)
  if (flags['retention-time'] !== undefined) {
    let value = flags['retention-time']
    let parsed = parseDuration(value)
    if (parsed == null) {
      cli.exit(1, `Could not parse retention time '${value}'; expected value like '36h' or '10d'`)
    }
    flags['retention-time'] = parsed
  }
  if (flags['no-compaction'] !== undefined) {
    flags['compaction'] = false
    delete flags['no-compaction']
  }

  let msg = `Configuring ${context.args.TOPIC}`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }
  cli.action(msg, co(function * () {
    return yield new HerokuKafkaClusters(heroku, process.env, context).configureTopic(context.args.CLUSTER, context.args.TOPIC, flags)
  }))

  cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
}

module.exports = {
  hidden: true,
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
    { name: 'replication-factor', description: 'number of replicas each partition in the topic has', hasValue: true }
  ],
  run: cli.command({preauth: true}, co.wrap(configureTopic))
}
