import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {hux} from '@heroku/heroku-cli-util'
import {withCluster, request} from '../../lib/clusters.js'
import {Addon} from '../../lib/shared.js'

const VERSION = 'v0'

export default class Fail extends Command {
  static args = {
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'triggers failure on one node in the cluster'

  static examples = [
    '$ heroku kafka:fail',
    '$ heroku kafka:fail kafka-aerodynamic-32763',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    catastrophic: flags.boolean({
      description: 'terminate the underlying instance instead and allow automation to replace it',
    }),
    zookeeper: flags.boolean({
      description: 'induce failure on one of the cluster\'s Zookeeper nodes instead',
    }),
    confirm: flags.string({
      description: 'pass the app name to skip the manual confirmation prompt',
    }),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(Fail)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      await hux.confirmCommand({
        comparison: flags.app,
        confirmation: flags.confirm,
        warningMessage: `This command will affect the cluster: ${addon.name}, which is on ${flags.app}\n\nThis command will forcibly terminate nodes in your cluster at random.\nYou should only run this command in controlled testing scenarios.`,
      })

      ux.action.start('Triggering failure')
      const result = await request(this.heroku, {
        method: 'POST',
        body: {
          catastrophic: flags.catastrophic,
          zookeeper: flags.zookeeper,
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/induce-failure`,
      })
      const response = result?.body || result
      ux.action.stop()

      ux.stdout(`${response.message}\n`)
    })
  }
}
