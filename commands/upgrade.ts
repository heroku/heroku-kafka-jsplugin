import cli from '@heroku/heroku-cli-util'
import {withCluster, request} from '../lib/clusters.js'
import { Addon } from '../lib/shared.js'

const VERSION = 'v0'

interface Context {
  app: string
  args: {
    CLUSTER?: string
  }
  flags: {
    version: string
    confirm?: string
  }
}

interface HerokuClient {
  request(params: any): Promise<any>
  get(path: string, options?: any): Promise<any>
  post(path: string, options?: any): Promise<any>
  [key: string]: any
}

async function upgradeCluster (context: Context, heroku: HerokuClient): Promise<void> {
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon: Addon) => {
    await cli.confirmApp(context.app, context.flags.confirm,
      `This command will upgrade the brokers of the cluster to version ${context.flags.version}.
                          Upgrading the cluster involves rolling restarts of brokers, and takes some time, depending on the
                          size of the cluster.`)

    let msg = 'Upgrading '
    if (context.args.CLUSTER) {
      msg += context.args.CLUSTER + ' '
    }
    msg += `to version ${context.flags.version}`

    cli.action.start(msg)

    await request(heroku, {
      method: 'PUT',
      body: {
        version: context.flags.version
      },
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/upgrade`
    })

    cli.action.done('started.\n\n')

    cli.log('Use `heroku kafka:wait` to monitor the upgrade.')
  })
}

export default {
  topic: 'kafka',
  command: 'upgrade',
  description: 'upgrades kafka broker version',
  help: `
    Upgrades the version running on the brokers

    Example:

  $ heroku kafka:upgrade --version 0.9
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'version', description: 'requested kafka version for upgrade', hasValue: true, required: true },
    { name: 'confirm', description: 'pass the app name to skip the manual confirmation prompt', hasValue: true }
  ],
  run: cli.command({preauth: true}, upgradeCluster)
}
