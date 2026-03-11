import cli from '@heroku/heroku-cli-util'
import {withCluster, request} from '../lib/clusters.js'

const VERSION = 'v0'

async function destroyTopic (context, heroku) {
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon) => {
    await cli.confirmApp(context.app, context.flags.confirm,
      `This command will affect the cluster: ${addon.name}, which is on ${context.app}`)

    await cli.action(`Deleting topic ${context.args.TOPIC}`, (async () => {
      const topicName = context.args.TOPIC
      return await request(heroku, {
        method: 'DELETE',
        body: {
          topic_name: topicName
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics/${topicName}`
      })
    })())

    cli.log('Your topic has been marked for deletion, and will be removed from the cluster shortly')
  })
}

let cmd = {
  topic: 'kafka',
  command: 'topics:destroy',
  description: 'deletes a topic in Kafka',
  help: `
    Deletes a topic in Kafka.
    Note that topics are deleted asynchronously, so even though this command has returned,
    a topic may still exist.

    Examples:

    $ heroku kafka:topics:destroy page-visits
    $ heroku kafka:topics:destroy page-visits HEROKU_KAFKA_BROWN_URL
`,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'TOPIC' },
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'confirm',
      description: 'pass the app name to skip the manual confirmation prompt',
      hasValue: true }
  ],
  run: cli.command({preauth: true}, destroyTopic)
}

export {cmd}
