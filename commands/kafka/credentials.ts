import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {withCluster, request} from '../../lib/clusters.js'
import {Addon} from '../../lib/shared.js'

const VERSION = 'v0'

export default class Credentials extends Command {
  static args = {
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'triggers credential rotation'

  static examples = [
    '$ heroku kafka:credentials --reset',
    '$ heroku kafka:credentials KAFKA_RED_URL --reset',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    reset: flags.boolean({
      description: 'reset credentials',
      required: true,
    }),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(Credentials)

    if (!flags.reset) {
      this.error('The --reset flag is required for this command')
    }

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const {body: response} = await request(this.heroku, {
        method: 'POST',
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/rotate-credentials`,
      })

      ux.stdout(response.message)
    })
  }
}
