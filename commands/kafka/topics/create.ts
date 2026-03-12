import {Command, flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'
import cli from '@heroku/heroku-cli-util'
import {parseDuration, formatIntervalFromMilliseconds} from '../../../lib/shared.js'
import {withCluster, request, fetchProvisionedInfo} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class TopicsCreate extends Command {
  static args = {
    topic: Args.string({description: 'topic name', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'creates a topic in Kafka'

  static examples = [
    '$ heroku kafka:topics:create page-visits --partitions 100',
    '$ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --replication-factor 3 --retention-time 10d',
    '$ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --compaction',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    partitions: flags.string({description: 'number of partitions to give the topic'}),
    'replication-factor': flags.string({description: 'number of replicas the topic should be created across'}),
    'retention-time': flags.string({description: 'length of time messages in the topic should be retained (at least 24h)'}),
    compaction: flags.boolean({description: 'whether to use compaction for this topic'}),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(TopicsCreate)

    let retentionTimeMillis: number | null = null
    if (flags['retention-time'] !== undefined) {
      retentionTimeMillis = parseDuration(flags['retention-time'])
      if (!retentionTimeMillis) {
        this.error(`Could not parse retention time '${flags['retention-time']}'; expected value like '10d' or '36h'`)
      }
    }

    const compaction = flags.compaction || false

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const addonInfo = await fetchProvisionedInfo(this.heroku, addon)

      if ((!compaction || addonInfo.shared_cluster) && !retentionTimeMillis) {
        retentionTimeMillis = addonInfo.limits.default_retention_ms || addonInfo.limits.minimum_retention_ms
      }

      let msg = `Creating topic ${args.topic} with compaction ${compaction ? 'enabled' : 'disabled'}`
      if (retentionTimeMillis) {
        msg += ` and retention time ${formatIntervalFromMilliseconds(retentionTimeMillis)}`
      }

      msg += ` on ${addon.name}`

      await cli.action(msg, (async () => {
        return await request(this.heroku, {
          method: 'POST',
          body: {
            topic: {
              name: args.topic,
              retention_time_ms: retentionTimeMillis,
              replication_factor: flags['replication-factor'],
              partition_count: flags.partitions,
              compaction: compaction,
            },
          },
          path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics`,
        })
      })())

      cli.log(`Use \`heroku kafka:topics:info ${args.topic}\` to monitor your topic.`)
      if (addonInfo.topic_prefix) {
        cli.log(`Your topic is using the prefix ${cli.color.green(addonInfo.topic_prefix)}. Learn more in Dev Center:`)
        cli.log('  https://devcenter.heroku.com/articles/multi-tenant-kafka-on-heroku#connecting-kafka-prefix')
      }
    })
  }
}
