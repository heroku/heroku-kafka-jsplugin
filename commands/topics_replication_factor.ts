import cli from '@heroku/heroku-cli-util'
import {withCluster, request, topicConfig} from '../lib/clusters.js'
import { Addon } from '../lib/shared.js'
import { HerokuClient } from '../types/command.js'

const VERSION = 'v0'

interface Context {
  app: string
  args: {
    TOPIC: string
    VALUE: string
    CLUSTER?: string
  }
}

async function replicationFactor (context: Context, heroku: HerokuClient): Promise<void> {
  let msg = `Setting replication factor for topic ${context.args.TOPIC} to ${context.args.VALUE}`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon: Addon) => {
    const topicName = context.args.TOPIC

    let topicInfo = await topicConfig(heroku, addon.id, topicName)

    await cli.action(msg, (async () => {
      return await request(heroku, {
        method: 'PUT',
        body: {
          topic: {
            name: topicName,
            replication_factor: context.args.VALUE,
            retention_time_ms: topicInfo.retention_time_ms,
            compaction: topicInfo.compaction
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`
      })
    })())
    cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
  })
}

export default {
  topic: 'kafka',
  command: 'topics:replication-factor',
  description: 'configures topic replication factor in Kafka',
  help: `
    Configures topic replication factor in Kafka.

    Examples:

  $ heroku kafka:topics:replication-factor page-visits 3
  $ heroku kafka:topics:replication-factor page-visits 3 HEROKU_KAFKA_BROWN_URL
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'VALUE' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, replicationFactor)
}
