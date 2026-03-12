import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {hux} from '@heroku/heroku-cli-util'
import {withCluster, request} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class ConsumerGroups extends Command {
  static args = {
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'lists available Kafka consumer groups'

  static examples = [
    '$ heroku kafka:consumer-groups',
    '$ heroku kafka:consumer-groups kafka-aerodynamic-32763',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(ConsumerGroups)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const {body: consumerGroups} = await request(this.heroku, {
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`,
      }) as {body: any}

      hux.styledHeader('Kafka Consumer Groups on ' + (args.cluster || 'HEROKU_KAFKA'))
      const consumerGroupData = consumerGroups.consumer_groups.map((g: any) => {
        return {
          name: g.name,
        }
      })

      ux.stdout('\n')
      if (consumerGroupData.length === 0) {
        ux.stdout('No consumer groups found on this Kafka cluster.\n')
        ux.stdout('Use heroku kafka:consumer-groups:create to create a consumer group.\n')
      } else {
        hux.table(consumerGroupData, {
          name: {header: 'Name'},
        })
      }
    })
  }
}
