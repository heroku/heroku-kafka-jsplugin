import cli from '@heroku/heroku-cli-util'
import humanize from 'humanize-plus'
import {withCluster, request} from '../lib/clusters.js'
import { Addon } from '../lib/shared.js'
import { HerokuClient } from '../types/command.js'

const VERSION = 'v0'

interface Context {
  app: string
  args: {
    CLUSTER?: string
  }
}

async function listTopics (context: Context, heroku: HerokuClient): Promise<void> {
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon: Addon) => {
    let topics = await request(heroku, {
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics`
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

    let filtered = topics.topics.filter((t: any) => t.name !== '__consumer_offsets')
    let topicData = filtered.map((t: any) => {
      return {
        name: t.name,
        messages: `${humanize.intComma(t.messages_in_per_second)}/sec`,
        bytes: `${humanize.fileSize(t.bytes_in_per_second)}/sec`
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
            {key: 'bytes', label: 'Traffic'}
          ]
        }
      )
    }
  })
}

const cmd = {
  topic: 'kafka',
  command: 'topics',
  description: 'lists available Kafka topics',
  help: `
    Lists available Kafka topics.

    Note that some plans use a topic prefix; to learn more,
    visit https://devcenter.heroku.com/articles/multi-tenant-kafka-on-heroku#connecting-kafka-prefix

    Examples:

    $ heroku kafka:topics
    $ heroku kafka:topics HEROKU_KAFKA_BROWN_URL
`,

  args: [
    { name: 'CLUSTER', optional: true }
  ],
  needsApp: true,
  needsAuth: true,
  run: cli.command({preauth: true}, listTopics)
}

export {cmd}
