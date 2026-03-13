import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {parseBool, isZookeeperAllowed} from '../../lib/shared.js'
import {withCluster, request} from '../../lib/clusters.js'
import {Addon} from '../../lib/shared.js'

const VERSION = 'v0'

export default class Zookeeper extends Command {
  static args = {
    value: Args.string({description: 'on/off, enable/disable', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }
  static description = '(Private Spaces only) control direct access to Zookeeper of your Kafka cluster'
  static examples = [
    '$ heroku kafka:zookeeper enable',
    '$ heroku kafka:zookeeper disable HEROKU_KAFKA_BROWN_URL',
  ]
  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }
  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(Zookeeper)

    const enabled = parseBool(args.value)
    if (enabled === undefined) {
      this.error(`Unknown value '${args.value}': must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable`)
    }

    let msg = `${enabled ? 'Enabling' : 'Disabling'} Zookeeper access`
    if (args.cluster) {
      msg += ` on ${args.cluster}`
    }

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      if (!isZookeeperAllowed(addon)) {
        ux.error('`kafka:zookeeper` is only available in Heroku Private Spaces')
      }

      ux.action.start(msg)
      await request(this.heroku, {
        method: 'POST',
        body: {
          enabled: enabled,
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/zookeeper`,
      })
      ux.action.stop()
    })
  }
}
