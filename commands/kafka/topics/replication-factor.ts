import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {withCluster, request, topicConfig} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class TopicsReplicationFactor extends Command {
  static args = {
    topic: Args.string({description: 'topic name', required: true}),
    value: Args.string({description: 'replication factor', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'configures topic replication factor in Kafka'

  static examples = [
    '$ heroku kafka:topics:replication-factor page-visits 3',
    '$ heroku kafka:topics:replication-factor page-visits 3 HEROKU_KAFKA_BROWN_URL',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(TopicsReplicationFactor)

    let msg = `Setting replication factor for topic ${args.topic} to ${args.value}`
    if (args.cluster) {
      msg += ` on ${args.cluster}`
    }

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const topicName = args.topic

      const topicInfo = await topicConfig(this.heroku, addon.id, topicName)

      ux.action.start(msg)
      await request(this.heroku, {
        method: 'PUT',
        body: {
          topic: {
            name: topicName,
            replication_factor: args.value,
            retention_time_ms: topicInfo.retention_time_ms,
            compaction: topicInfo.compaction,
          },
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`,
      })
      ux.action.stop()
      ux.stdout(`Use \`heroku kafka:topics:info ${args.topic}\` to monitor your topic.\n`)
    })
  }
}
