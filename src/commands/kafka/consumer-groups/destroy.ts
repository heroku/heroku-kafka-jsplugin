import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {hux} from '@heroku/heroku-cli-util'
import {withCluster, request} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class ConsumerGroupsDestroy extends Command {
  static args = {
    consumer_group: Args.string({description: 'consumer group name', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }
  static description = 'destroys a consumer group in Kafka'
  static examples = [
    '$ heroku kafka:consumer-groups:destroy word-counters',
    '$ heroku kafka:consumer-groups:destroy word-counters kafka-aerodynamic-32763',
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
    const {args, flags} = await this.parse(ConsumerGroupsDestroy)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      await hux.confirmCommand({
        comparison: flags.app,
        confirmation: flags.confirm,
        warningMessage: `This command will affect the cluster: ${addon.name}, which is on ${flags.app}`,
      })

      ux.action.start(`Deleting consumer group ${args.consumer_group}`)
      await request(this.heroku, {
        method: 'delete',
        body: {
          consumer_group: {
            name: args.consumer_group,
          },
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`,
      })
      ux.action.stop()

      ux.stdout('Your consumer group has been deleted\n')
    })
  }
}
