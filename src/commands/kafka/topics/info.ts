import {Command, flags} from '@heroku-cli/command'
import {color, hux} from '@heroku/heroku-cli-util'
import {Args} from '@oclif/core'
import humanize from 'humanize-plus'

import {topicConfig, withCluster} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const ONE_HOUR_IN_MS = 60 * 60 * 1000
const TWENTY_FOUR_HOURS_IN_MS = ONE_HOUR_IN_MS * 24
const TWO_DAYS_IN_MS = TWENTY_FOUR_HOURS_IN_MS * 2

function retention(retentionTimeMs: number): string {
  if (retentionTimeMs < ONE_HOUR_IN_MS) {
    return `${Math.round(retentionTimeMs / 1000.0)} seconds`
  }

  if (retentionTimeMs < TWO_DAYS_IN_MS) {
    return `${Math.round(retentionTimeMs / ONE_HOUR_IN_MS)} hours`
  }

  return `${Math.round(retentionTimeMs / TWENTY_FOUR_HOURS_IN_MS)} days`
}

function topicInfo(topic: any): Record<string, string> {
  const info: Record<string, string> = {
    Producers: `${humanize.intComma(topic.messages_in_per_second)} ${humanize.pluralize(topic.messages_in_per_second, 'message')}/second (${humanize.fileSize(topic.bytes_in_per_second)}/second) total`,
    Consumers: `${humanize.fileSize(topic.bytes_out_per_second)}/second total`,
    Partitions: `${topic.partitions} ${humanize.pluralize(topic.partitions, 'partition')}`,
    'Replication Factor': `${topic.replication_factor}`,
  }

  if (topic.prefix) {
    info['Topic Prefix'] = color.green(topic.prefix)
  }

  if (topic.compaction) {
    info.Compaction = `Compaction is enabled for ${topic.name}`
  } else {
    info.Compaction = `Compaction is disabled for ${topic.name}`
  }

  if (topic.retention_time_ms) {
    info.Retention = retention(topic.retention_time_ms)
  }

  return info
}

export default class TopicsInfo extends Command {
  static args = {
    topic: Args.string({description: 'topic name', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }
  static description = 'shows information about a topic in Kafka'
  static examples = [
    '$ heroku kafka:topics:info page-visits',
    '$ heroku kafka:topics:info page-visits HEROKU_KAFKA_BROWN_URL',
  ]
  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }
  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(TopicsInfo)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const topicName = args.topic
      const topic = await topicConfig(this.heroku, addon.id, topicName)
      if (topic.partitions < 1) {
        this.error(`topic ${topicName} is not available yet`)
      } else {
        hux.styledHeader(addon.name + ' :: ' + topicName)
        hux.styledObject(topicInfo(topic))
      }
    })
  }
}
