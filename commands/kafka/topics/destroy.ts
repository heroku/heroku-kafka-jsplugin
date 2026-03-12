import {Command, flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'
import cli from '@heroku/heroku-cli-util'
import {withCluster, request} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class TopicsDestroy extends Command {
  static args = {
    topic: Args.string({description: 'topic name', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'deletes a topic in Kafka'

  static examples = [
    '$ heroku kafka:topics:destroy page-visits',
    '$ heroku kafka:topics:destroy page-visits HEROKU_KAFKA_BROWN_URL',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    confirm: flags.string({
      description: 'pass the app name to skip the manual confirmation prompt',
    }),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(TopicsDestroy)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      await cli.confirmApp(flags.app, flags.confirm,
        `This command will affect the cluster: ${addon.name}, which is on ${flags.app}`)

      await cli.action(`Deleting topic ${args.topic}`, (async () => {
        const topicName = args.topic
        return await request(this.heroku, {
          method: 'DELETE',
          body: {
            topic_name: topicName,
          },
          path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`,
        })
      })())

      cli.log('Your topic has been marked for deletion, and will be removed from the cluster shortly')
    })
  }
}
