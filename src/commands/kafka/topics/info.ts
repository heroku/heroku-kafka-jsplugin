import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {color, hux} from '@heroku/heroku-cli-util'
import humanize from 'humanize-plus'
import {withCluster, topicConfig} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const ONE_HOUR_IN_MS = 60 * 60 * 1000
const TWENTY_FOUR_HOURS_IN_MS = ONE_HOUR_IN_MS * 24
const TWO_DAYS_IN_MS = TWENTY_FOUR_HOURS_IN_MS * 2

function retention(retentionTimeMs: number): string {
  if (retentionTimeMs < ONE_HOUR_IN_MS) {
    return `${Math.round(retentionTimeMs / 1000.0)} seconds`
  } else if (retentionTimeMs < TWO_DAYS_IN_MS) {
    return `${Math.round(retentionTimeMs / ONE_HOUR_IN_MS)} hours`
  } else {
    return `${Math.round(retentionTimeMs / TWENTY_FOUR_HOURS_IN_MS)} days`
  }
}

function topicInfo(topic: any): Array<{name: string, values: string[]}> {
  const lines = [
    {
      name: 'Producers',
      values: [`${humanize.intComma(topic.messages_in_per_second)} ${humanize.pluralize(topic.messages_in_per_second, 'message')}/second (${humanize.fileSize(topic.bytes_in_per_second)}/second) total`],
    },
    {
      name: 'Consumers',
      values: [`${humanize.fileSize(topic.bytes_out_per_second)}/second total`],
    },
    {
      name: 'Partitions',
      values: [`${topic.partitions} ${humanize.pluralize(topic.partitions, 'partition')}`],
    },
    {
      name: 'Replication Factor',
      values: [`${topic.replication_factor}`],
    },
  ]

  if (topic.prefix) {
    lines.unshift({
      name: 'Topic Prefix',
      values: [color.green(topic.prefix)],
    })
  }

  if (topic.compaction) {
    lines.push({
      name: 'Compaction',
      values: [`Compaction is enabled for ${topic.name}`],
    })
  } else {
    lines.push({
      name: 'Compaction',
      values: [`Compaction is disabled for ${topic.name}`],
    })
  }

  if (topic.retention_time_ms) {
    lines.push({
      name: 'Retention',
      values: [retention(topic.retention_time_ms)],
    })
  }

  return lines
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
        ux.stdout('\n')
        for (const line of topicInfo(topic)) {
          ux.stdout(`${line.name}: ${line.values.join(', ')}\n`)
        }
      }
    })
  }
}
