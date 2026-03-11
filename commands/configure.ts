import cli from '@heroku/heroku-cli-util'
import {HerokuKafkaClusters} from '../lib/clusters.js'
import {parseDuration} from '../lib/shared.js'
import { HerokuClient } from '../types/command.js'

interface Context {
  app: string
  args: {
    TOPIC: string
    CLUSTER?: string
  }
  flags: {
    'retention-time'?: string
    'compaction'?: boolean
    'no-compaction'?: boolean
    'replication-factor'?: string
  }
}

async function configureTopic (context: Context, heroku: HerokuClient): Promise<void> {
  cli.warn('WARNING: kafka:configure is deprecated and will be removed in a future version; use kafka:topics:compaction, kafka:topics:retention-time, or kafka:topics:replication-factor instead')

  if (context.flags['no-compaction'] && context.flags['compaction']) {
    cli.exit(1, 'can\'t pass both no-compaction and compaction')
  }

  let flags: any = Object.assign({}, context.flags)
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
  await cli.action(msg, (async () => {
    return await new HerokuKafkaClusters(heroku, process.env, context).configureTopic(context.args.CLUSTER, context.args.TOPIC, flags)
  })())

  cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
}

export default {
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
  run: cli.command({preauth: true}, configureTopic)
}
