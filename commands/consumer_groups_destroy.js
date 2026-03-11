import cli from '@heroku/heroku-cli-util'
import {withCluster, request} from '../lib/clusters.js'

const VERSION = 'v0'

async function destroyConsumerGroup (context, heroku) {
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon) => {
    await cli.confirmApp(context.app, context.flags.confirm,
      `This command will affect the cluster: ${addon.name}, which is on ${context.app}`)

    await cli.action(`Deleting consumer group ${context.args.CONSUMER_GROUP}`, (async () => {
      return await request(heroku, {
        method: 'delete',
        body: {
          consumer_group: {
            name: context.args.CONSUMER_GROUP
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`
      })
    })())

    cli.log('Your consumer group has been deleted')
  })
}

export default {
  topic: 'kafka',
  command: 'consumer-groups:destroy',
  description: 'destroys a consumer group in Kafka',
  help: `
    Destroys a consumer group in Kafka.

    Examples:

  $ heroku kafka:consumer-groups:destroy word-counters
  $ heroku kafka:consumer-groups:destroy word-counters kafka-aerodynamic-32763
  `,
  needsApp: true,
  needsAuth: true,
  flags: [
    { name: 'confirm',
      description: 'pass the app name to skip the manual confirmation prompt',
      hasValue: true }
  ],
  args: [
    { name: 'CONSUMER_GROUP' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, destroyConsumerGroup)
}
