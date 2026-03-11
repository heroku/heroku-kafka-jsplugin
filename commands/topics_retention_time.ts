import cli from '@heroku/heroku-cli-util'
import {parseDuration} from '../lib/shared.js'
import {withCluster, request, topicConfig, fetchProvisionedInfo} from '../lib/clusters.js'
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

async function retentionTime (context: Context, heroku: HerokuClient): Promise<void> {
  let parsed = null
  if (context.args.VALUE !== 'disable') {
    parsed = parseDuration(context.args.VALUE)
    if (!parsed) {
      cli.exit(1, `Unknown retention time '${context.args.VALUE}'; expected 'disable' or value like '36h' or '10d'`)
    }
  }

  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon: Addon) => {
    const topicName = context.args.TOPIC
    let [ topicInfo, addonInfo ] = await Promise.all([
      topicConfig(heroku, addon.id, topicName),
      fetchProvisionedInfo(heroku, addon)
    ])
    let cleanupPolicy = {
      retention_time_ms: parsed,
      compaction: (!parsed || (addonInfo.capabilities.supports_mixed_cleanup_policy && topicInfo.compaction))
    }

    let msg
    if (!parsed) {
      msg = 'Disabling time-based retention'
      if (cleanupPolicy.compaction !== topicInfo.compaction) {
        msg += ` and ${cleanupPolicy.compaction ? 'enabling' : 'disabling'} compaction`
      }
    } else {
      msg = `Setting retention time to ${context.args.VALUE}`
      if (!addonInfo.capabilities.supports_mixed_cleanup_policy) {
        msg += ' and disabling compaction'
      }
    }
    msg += ` for topic ${context.args.TOPIC} on ${addon.name}`

    await cli.action(msg, (async () => {
      return await request(heroku, {
        method: 'PUT',
        body: {
          topic: Object.assign({ name: topicName }, cleanupPolicy)
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`
      })
    })())

    cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
  })
}

export default {
  topic: 'kafka',
  command: 'topics:retention-time',
  description: 'configures or disables topic retention time (e.g. 10d, 36h)',
  help: `
    Configures or disables topic retention time in Kafka. If disabling, compaction is
    required and is automatically turned on. If time-based retention is enabled on an
    add-on that does not support compaction and time-based retention together, compaction
    is automatically turned off. Time-based retention cannot be disabled on multi-tenant plans.

    Examples:

  $ heroku kafka:topics:retention-time page-visits 10d
  $ heroku kafka:topics:retention-time page-visits disable
  $ heroku kafka:topics:retention-time page-visits 36h kafka-shiny-2345
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'VALUE' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, retentionTime)
}
