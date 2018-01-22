'use strict'

const cli = require('heroku-cli-util')
const co = require('co')

const HerokuKafkaClusters = require('../lib/clusters').HerokuKafkaClusters

function * run (context, heroku) {
  const fetcher = require('../lib/fetcher')(heroku)
  const app = context.app
  const cluster = context.args.CLUSTER

  const shogun = new HerokuKafkaClusters(heroku, process.env, context)

  let waitFor = co.wrap(function * waitFor (cluster) {
    const wait = require('co-wait')
    let interval = parseInt(context.flags['wait-interval'])
    if (!interval || interval < 0) interval = 5

    let status
    let waiting = false

    while (true) {
      status = yield shogun.waitStatus(cluster)

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

      yield wait(interval * 1000)
    }
  })

  let clusters = []
  if (cluster) {
    clusters = yield [fetcher.addon(app, cluster)]
  } else {
    clusters = yield fetcher.all(app)
  }

  for (let cluster of clusters) yield waitFor(cluster)
}

module.exports = {
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
  run: cli.command({preauth: true}, co.wrap(run))
}
