import cli from '@heroku/heroku-cli-util'
import {parseBool, isZookeeperAllowed} from '../lib/shared.js'
import {withCluster, request} from '../lib/clusters.js'

const VERSION = 'v0'

async function zookeeper (context, heroku) {
  let enabled = parseBool(context.args.VALUE)
  if (enabled === undefined) {
    cli.exit(1, `Unknown value '${context.args.VALUE}': must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable`)
  }

  let msg = `${enabled ? 'Enabling' : 'Disabling'} Zookeeper access`
  if (context.args.CLUSTER) {
    msg += ` on ${context.args.CLUSTER}`
  }

  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon) => {
    if (!isZookeeperAllowed(addon)) {
      cli.exit(1, '`kafka:zookeeper` is only available in Heroku Private Spaces')
    }

    await cli.action(msg, (async () => {
      return await request(heroku, {
        method: 'POST',
        body: {
          enabled: enabled
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/zookeeper`
      })
    })())
  })
}

export default {
  topic: 'kafka',
  command: 'zookeeper',
  description: '(Private Spaces only) control direct access to Zookeeper of your Kafka cluster',
  args: [
    { name: 'VALUE' },
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Enables or disables Zookeeper access to your Kafka cluster. Note:
    Zookeeper access is only available in Heroku Private Spaces.

    Examples:

    $ heroku kafka:zookeeper enable
    $ heroku kafka:zookeeper disable HEROKU_KAFKA_BROWN_URL

  To check the Zookeeper status of the cluster, see

    $ heroku kafka:info
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command({preauth: true}, zookeeper)
}
