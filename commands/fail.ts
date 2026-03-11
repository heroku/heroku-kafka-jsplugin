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
    catastrophic?: boolean
    zookeeper?: boolean
    confirm?: string
  }
}

interface HerokuClient {
  request(params: any): Promise<any>
  get(path: string, options?: any): Promise<any>
  post(path: string, options?: any): Promise<any>
  [key: string]: any
}

async function fail (context: Context, heroku: HerokuClient): Promise<void> {
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon: Addon) => {
    await cli.confirmApp(context.app, context.flags.confirm,
      `This command will affect the cluster: ${addon.name}, which is on ${context.app}\n\nThis command will forcibly terminate nodes in your cluster at random.\nYou should only run this command in controlled testing scenarios.`)

    let response = await cli.action('Triggering failure', (async () => {
      return await request(heroku, {
        method: 'POST',
        body: {
          catastrophic: context.flags.catastrophic,
          zookeeper: context.flags.zookeeper
        },
        path: `/data/kafka/${VERSION}/clusters/${addon.id}/induce-failure`
      })
    })())

    cli.log(response.message)
  })
}

export default {
  topic: 'kafka',
  command: 'fail',
  description: 'triggers failure on one node in the cluster',
  help: `
    Triggers failure on one Kafka broker in the cluster by stopping the underlying
    instance and allowing Heroku automation to recover it.

    Examples:

    $ heroku kafka:fail
    $ heroku kafka:fail kafka-aerodynamic-32763
`,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'catastrophic',
      description: 'terminate the underlying instance instead and allow automation to replace it',
      hasValue: false },
    { name: 'zookeeper',
      description: 'induce failure on one of the cluster\'s Zookeeper nodes instead',
      hasValue: false },
    { name: 'confirm',
      description: 'pass the app name to skip the manual confirmation prompt',
      hasValue: true,
      required: false }
  ],
  run: cli.command({preauth: true}, fail)
}
