import cli from '@heroku/heroku-cli-util'
import {withCluster, request} from '../lib/clusters.js'
import { Addon } from '../lib/shared.js'
import { HerokuClient } from '../types/command.js'

const VERSION = 'v0'

interface Context {
  app: string
  args: {
    CONSUMER_GROUP: string
    CLUSTER?: string
  }
}

async function createConsumerGroup (context: Context, heroku: HerokuClient): Promise<void> {
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon: Addon) => {
    let msg = `Creating consumer group ${context.args.CONSUMER_GROUP}`
    if (context.args.CLUSTER) {
      msg += ` on ${context.args.CLUSTER}`
    }
    var created = true

    await cli.action(msg, (async () => {
      return await request(heroku, {
        method: 'POST',
        body: {
          consumer_group: {
            name: context.args.CONSUMER_GROUP
          }
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`
      })
    })()).catch((err: any) => {
      if (err.statusCode === 400 && err.body.message === 'this command is not required or enabled on dedicated clusters') {
        created = false
        cli.warn(`${cli.color.addon(addon.name)} does not need consumer groups managed explicitly, so this command does nothing`)
      } else {
        throw err
      }
    })

    if (created === true) {
      cli.log('Use `heroku kafka:consumer-groups` to list your consumer groups.')
    }
  })
}

export default {
  topic: 'kafka',
  command: 'consumer-groups:create',
  description: 'creates a consumer group in Kafka',
  help: `
    Creates a consumer group in Kafka.

    Examples:

  $ heroku kafka:consumer-groups:create word-counters
  $ heroku kafka:consumer-groups:create word-counters kafka-aerodynamic-32763
  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'CONSUMER_GROUP' },
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command({preauth: true}, createConsumerGroup)
}
