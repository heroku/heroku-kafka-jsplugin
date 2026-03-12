import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {color} from '@heroku/heroku-cli-util'
import {withCluster, request} from '../../../lib/clusters.js'
import {Addon} from '../../../lib/shared.js'

const VERSION = 'v0'

export default class ConsumerGroupsCreate extends Command {
  static args = {
    consumer_group: Args.string({description: 'consumer group name', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'creates a consumer group in Kafka'

  static examples = [
    '$ heroku kafka:consumer-groups:create word-counters',
    '$ heroku kafka:consumer-groups:create word-counters kafka-aerodynamic-32763',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(ConsumerGroupsCreate)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      let msg = `Creating consumer group ${args.consumer_group}`
      if (args.cluster) {
        msg += ` on ${args.cluster}`
      }

      let created = true

      ux.action.start(msg)
      try {
        await request(this.heroku, {
          method: 'POST',
          body: {
            consumer_group: {
              name: args.consumer_group,
            },
          },
          path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`,
        })
        ux.action.stop()
      } catch (err: any) {
        const statusCode = err.statusCode || err.http?.statusCode
        if (statusCode === 400 && err.body?.message === 'this command is not required or enabled on dedicated clusters') {
          created = false
          ux.action.stop()
          ux.warn(`${color.addon(addon.name)} does not need consumer groups managed explicitly, so this command does nothing`)
        } else {
          ux.action.stop('failed')
          throw err
        }
      }

      if (created === true) {
        ux.stdout('Use `heroku kafka:consumer-groups` to list your consumer groups.\n')
      }
    })
  }
}
