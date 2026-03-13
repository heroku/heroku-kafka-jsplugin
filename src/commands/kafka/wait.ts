import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {color} from '@heroku/heroku-cli-util'
import {HerokuKafkaClusters} from '../../lib/clusters.js'
import fetcherFn from '../../lib/fetcher.js'
import {Addon} from '../../lib/shared.js'

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default class Wait extends Command {
  static args = {
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }
  static description = 'waits until Kafka is ready to use'
  static examples = [
    '$ heroku kafka:wait',
    '$ heroku kafka:wait HEROKU_KAFKA_BROWN',
  ]
  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    'wait-interval': flags.string({
      description: 'how frequently to poll in seconds (to avoid rate limiting)',
    }),
  }
  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(Wait)

    const fetcher = fetcherFn(this.heroku)
    const shogun = new HerokuKafkaClusters(this.heroku, process.env, {app: flags.app, args: {CLUSTER: args.cluster}, flags})

    const waitFor = async (cluster: Addon): Promise<void> => {
      let interval = parseInt(flags['wait-interval'] || '5')
      if (!interval || interval < 0) interval = 5

      let status
      let waiting = false

      while (true) {
        status = await shogun.waitStatus(cluster)

        if (status && status['error?']) {
          this.error(status.message)
        } else if (status && !status['waiting?']) {
          if (waiting && status) ux.action.stop(status.message)
          return
        } else if (status && status['deprovisioned?']) {
          ux.warn('This cluster was deprovisioned.')
          return
        } else if (status && status['missing?']) {
          ux.warn('This cluster could not be found.')
          return
        }

        if (!waiting) {
          waiting = true
          ux.action.start(`Waiting for cluster ${color.addon(cluster.name)}`)
        }

        if (status) ux.action.status = status.message

        await sleep(interval * 1000)
      }
    }

    let clusters: Addon[] = []
    if (args.cluster) {
      clusters = await Promise.all([fetcher.addon(flags.app, args.cluster)])
    } else {
      clusters = await fetcher.all(flags.app)
    }

    for (const cluster of clusters) await waitFor(cluster)
  }
}
