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
    reset?: boolean
  }
}

interface HerokuClient {
  request(params: any): Promise<any>
  get(path: string, options?: any): Promise<any>
  post(path: string, options?: any): Promise<any>
  [key: string]: any
}

async function credentialsRotate (context: Context, heroku: HerokuClient): Promise<void> {
  if (!context.flags.reset) {
    throw new Error('The --reset flag is required for this command')
  }

  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon: Addon) => {
    let response = await request(heroku, {
      method: 'POST',
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/rotate-credentials`
    })

    cli.log(response.message)
  })
}

export default {
  topic: 'kafka',
  command: 'credentials',
  description: 'triggers credential rotation',
  help: `
    Rotates client certificates

    Examples:

    $ heroku kafka:credentials --reset
    $ heroku kafka:credentials KAFKA_RED_URL --reset
`,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'reset',
      description: 'reset credentials',
      hasValue: false,
      required: true }
  ],
  run: cli.command({preauth: true}, credentialsRotate)
}
