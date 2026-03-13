import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'

import {
  fetchProvisionedInfo, request, topicConfig, withCluster,
} from '../../../lib/clusters.js'
import {Addon, parseDuration} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class TopicsRetentionTime extends Command {
  static args = {
    topic: Args.string({description: 'topic name', required: true}),
    value: Args.string({description: 'retention time (e.g. 10d, 36h) or disable', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }
  static description = 'configures or disables topic retention time (e.g. 10d, 36h)'
  static examples = [
    '$ heroku kafka:topics:retention-time page-visits 10d',
    '$ heroku kafka:topics:retention-time page-visits disable',
    '$ heroku kafka:topics:retention-time page-visits 36h kafka-shiny-2345',
  ]
  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }
  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(TopicsRetentionTime)

    let parsed = null
    if (args.value !== 'disable') {
      parsed = parseDuration(args.value)
      if (!parsed) {
        this.error(`Unknown retention time '${args.value}'; expected 'disable' or value like '36h' or '10d'`)
      }
    }

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const topicName = args.topic
      const [topicInfo, addonInfo] = await Promise.all([
        topicConfig(this.heroku, addon.id, topicName),
        fetchProvisionedInfo(this.heroku, addon),
      ])
      const cleanupPolicy = {
        retention_time_ms: parsed,
        compaction: (!parsed || (addonInfo.capabilities.supports_mixed_cleanup_policy && topicInfo.compaction)),
      }

      let msg
      if (!parsed) {
        msg = 'Disabling time-based retention'
        if (cleanupPolicy.compaction !== topicInfo.compaction) {
          msg += ` and ${cleanupPolicy.compaction ? 'enabling' : 'disabling'} compaction`
        }
      } else {
        msg = `Setting retention time to ${args.value}`
        if (!addonInfo.capabilities.supports_mixed_cleanup_policy) {
          msg += ' and disabling compaction'
        }
      }

      msg += ` for topic ${args.topic} on ${addon.name}`

      ux.action.start(msg)
      await request(this.heroku, {
        method: 'PUT',
        body: {
          topic: Object.assign({name: topicName}, cleanupPolicy),
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`,
      })
      ux.action.stop()

      ux.stdout(`Use \`heroku kafka:topics:info ${args.topic}\` to monitor your topic.\n`)
    })
  }
}
