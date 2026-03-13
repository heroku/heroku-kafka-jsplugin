import {Command, flags} from '@heroku-cli/command'
import {hux} from '@heroku/heroku-cli-util'
import {Args, ux} from '@oclif/core'

import {request, withCluster} from '../../lib/clusters.js'
import {Addon} from '../../lib/shared.js'

const VERSION = 'v0'

export default class Upgrade extends Command {
  static args = {
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }
  static description = 'upgrades kafka broker version'
  static examples = [
    '$ heroku kafka:upgrade --version 0.9',
  ]
  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    version: flags.string({
      description: 'requested kafka version for upgrade',
      required: true,
    }),
    confirm: flags.string({
      description: 'pass the app name to skip the manual confirmation prompt',
    }),
  }
  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(Upgrade)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      await hux.confirmCommand({
        comparison: flags.app,
        confirmation: flags.confirm,
        warningMessage: `This command will upgrade the brokers of the cluster to version ${flags.version}.
                          Upgrading the cluster involves rolling restarts of brokers, and takes some time, depending on the
                          size of the cluster.`,
      })

      let msg = 'Upgrading '
      if (args.cluster) {
        msg += args.cluster + ' '
      }

      msg += `to version ${flags.version}`

      ux.action.start(msg)

      await request(this.heroku, {
        method: 'PUT',
        body: {
          version: flags.version,
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/upgrade`,
      })

      ux.action.stop('started.')

      ux.stdout('\nUse `heroku kafka:wait` to monitor the upgrade.\n')
    })
  }
}
