import cli from '@heroku/heroku-cli-util'
import {withCluster, request} from '../lib/clusters.js'

const VERSION = 'v0'

async function listConsumerGroups (context, heroku) {
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon) => {
    let consumerGroups = await request(heroku, {
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/consumer_groups`
    })
    cli.styledHeader('Kafka Consumer Groups on ' + (context.args.CLUSTER || 'HEROKU_KAFKA'))
    let consumerGroupData = consumerGroups.consumer_groups.map((g) => {
      return {
        name: g.name
      }
    })
    cli.log()
    if (consumerGroupData.length === 0) {
      cli.log('No consumer groups found on this Kafka cluster.')
      cli.log('Use heroku kafka:consumer-groups:create to create a consumer group.')
    } else {
      cli.table(consumerGroupData,
        {
          columns: [
            {key: 'name', label: 'Name'}
          ]
        }
      )
    }
  })
}

export default {
  topic: 'kafka',
  command: 'consumer-groups',
  description: 'lists available Kafka consumer groups',
  help: `
    Lists available Kafka consumer groups.

    Examples:

    $ heroku kafka:consumer-groups
    $ heroku kafka:consumer-groups kafka-aerodynamic-32763
`,

  args: [
    { name: 'CLUSTER', optional: true }
  ],
  needsApp: true,
  needsAuth: true,
  run: cli.command({preauth: true}, listConsumerGroups)
}
