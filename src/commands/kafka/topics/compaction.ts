import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {parseBool, formatIntervalFromMilliseconds} from '../../../lib/shared.js'
import {withCluster, request, topicConfig, fetchProvisionedInfo} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class TopicsCompaction extends Command {
  static args = {
    topic: Args.string({description: 'topic name', required: true}),
    value: Args.string({description: 'enable or disable', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'configures topic compaction in Kafka'

  static examples = [
    '$ heroku kafka:topics:compaction page-visits enable',
    '$ heroku kafka:topics:compaction page-visits disable kafka-shiny-2345',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(TopicsCompaction)

    const enabled = parseBool(args.value)
    if (enabled === undefined) {
      this.error(`Unknown value '${args.value}': must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable`)
    }

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const topicName = args.topic
      const [topicInfo, addonInfo] = await Promise.all([
        topicConfig(this.heroku, addon.id, topicName),
        fetchProvisionedInfo(this.heroku, addon),
      ])
      let retentionTime
      if (enabled) {
        retentionTime = addonInfo.capabilities.supports_mixed_cleanup_policy ? topicInfo.retention_time_ms : null
      } else {
        retentionTime = topicInfo.retention_time_ms || addonInfo.limits.minimum_retention_ms
      }

      const cleanupPolicy = {
        compaction: enabled,
        retention_time_ms: retentionTime,
      }

      let msg = `${enabled ? 'Enabling' : 'Disabling'} compaction`
      if (enabled && !addonInfo.capabilities.supports_mixed_cleanup_policy) {
        msg += ' and disabling time-based retention'
      } else if (cleanupPolicy.retention_time_ms !== topicInfo.retention_time_ms) {
        msg += ` and setting retention time to ${formatIntervalFromMilliseconds(retentionTime)}`
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
