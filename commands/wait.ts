import cli from '@heroku/heroku-cli-util'
import {HerokuKafkaClusters} from '../lib/clusters.js'
import fetcherFn from '../lib/fetcher.js'
import { Addon } from '../lib/shared.js'
import { HerokuClient } from '../types/command.js'

interface Context {
  app: string
  args: {
    CLUSTER?: string
  }
  flags: {
    'wait-interval'?: string
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run (context: Context, heroku: HerokuClient): Promise<void> {
  const fetcher = fetcherFn(heroku)
  const app = context.app
  const cluster = context.args.CLUSTER

  const shogun = new HerokuKafkaClusters(heroku, process.env, context)

  async function waitFor (cluster: Addon): Promise<void> {
    let interval = parseInt(context.flags['wait-interval'])
    if (!interval || interval < 0) interval = 5

    let status
    let waiting = false

    while (true) {
      status = await shogun.waitStatus(cluster)

      if (!status['waiting?']) {
        if (waiting) cli.action.done(status.message)
        return
      } else if (status['deprovisioned?']) {
        cli.warn('This cluster was deprovisioned.')
        return
      } else if (status['missing?']) {
        cli.warn('This cluster could not be found.')
        return
      }

      if (!waiting) {
        waiting = true
        cli.action.start(`Waiting for cluster ${cli.color.addon(cluster.name)}`)
      }

      cli.action.status(status.message)

      await sleep(interval * 1000)
    }
  }

  let clusters: Addon[] = []
  if (cluster) {
    clusters = await Promise.all([fetcher.addon(app, cluster)])
  } else {
    clusters = await fetcher.all(app)
  }

  for (let cluster of clusters) await waitFor(cluster)
}

export default {
  topic: 'kafka',
  command: 'wait',
  description: 'waits until Kafka is ready to use',
  args: [{name: 'CLUSTER', optional: true}],
  flags: [{name: 'wait-interval', description: 'how frequently to poll in seconds (to avoid rate limiting)', hasValue: true}],
  help: `
    Waits until Kafka is ready to use.

    Examples:

    $ heroku kafka:wait
    $ heroku kafka:wait HEROKU_KAFKA_BROWN
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command({preauth: true}, run)
}
