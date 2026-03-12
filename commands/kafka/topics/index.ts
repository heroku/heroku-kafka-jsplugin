import {Command, flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'
import cli from '@heroku/heroku-cli-util'
import humanize from 'humanize-plus'
import {withCluster, request} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class Topics extends Command {
  static args = {
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'lists available Kafka topics'

  static examples = [
    '$ heroku kafka:topics',
    '$ heroku kafka:topics HEROKU_KAFKA_BROWN_URL',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(Topics)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const topics = await request(this.heroku, {
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics`,
      })
      cli.styledHeader('Kafka Topics on ' + (topics.attachment_name || 'HEROKU_KAFKA'))

      if (topics.topics.length !== 0) {
        const extraInfo: string[] = []
        if (topics.limits && topics.limits.max_topics) {
          extraInfo.push(`${topics.topics.length} / ${topics.limits.max_topics} topics`)
        }

        if (topics.prefix) {
          extraInfo.push(`prefix: ${cli.color.green(topics.prefix)}`)
        }

        if (extraInfo.length > 0) {
          cli.log(extraInfo.join('; '))
        }
      }

      const filtered = topics.topics.filter((t: any) => t.name !== '__consumer_offsets')
      const topicData = filtered.map((t: any) => {
        return {
          name: t.name,
          messages: `${humanize.intComma(t.messages_in_per_second)}/sec`,
          bytes: `${humanize.fileSize(t.bytes_in_per_second)}/sec`,
        }
      })
      cli.log()
      if (topicData.length === 0) {
        cli.log('No topics found on this Kafka cluster.')

        if (topics.limits && topics.limits.max_topics) {
          cli.log(`Use heroku kafka:topics:create to create a topic (limit ${topics.limits.max_topics}).`)
        } else {
          cli.log('Use heroku kafka:topics:create to create a topic.')
        }
      } else {
        cli.table(topicData,
          {
            columns: [
              {key: 'name', label: 'Name'},
              {key: 'messages', label: 'Messages'},
              {key: 'bytes', label: 'Traffic'},
            ],
          }
        )
      }
    })
  }
}
