'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const {Command} = require('cli-engine-heroku')
const flags = require('../lib/flags')

let formatIntervalFromMilliseconds = require('../lib/shared').formatIntervalFromMilliseconds
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let fetchProvisionedInfo = require('../lib/clusters').fetchProvisionedInfo

const VERSION = 'v0'

class TopicsCreate extends Command {
  async run () {
    const context = this
    const heroku = this.legacyHerokuClient

    let flags = context.flags
    let retentionTimeMillis = flags['retention-time']
    let compaction = flags['compaction'] || false

    await co(withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
      let addonInfo = yield fetchProvisionedInfo(heroku, addon)

      if ((!compaction || addonInfo.shared_cluster) && !retentionTimeMillis) {
        retentionTimeMillis = addonInfo.limits.minimum_retention_ms
      }

      let msg = `Creating topic ${context.args.TOPIC} with compaction ${compaction ? 'enabled' : 'disabled'}`
      if (retentionTimeMillis) {
        msg += ` and retention time ${formatIntervalFromMilliseconds(retentionTimeMillis)}`
      }
      msg += ` on ${addon.name}`

      yield cli.action(msg, co(function * () {
        return yield request(heroku, {
          method: 'POST',
          body: {
            topic: {
              name: context.args.TOPIC,
              retention_time_ms: retentionTimeMillis,
              replication_factor: flags['replication-factor'],
              partition_count: flags['partitions'],
              compaction: compaction
            }
          },
          path: `/data/kafka/${VERSION}/clusters/${addon.id}/topics`
        })
      }))

      cli.log(`Use \`heroku kafka:topics:info ${context.args.TOPIC}\` to monitor your topic.`)
    }))
  }
}

exports.cmd = Object.assign(TopicsCreate, {
  topic: 'kafka',
  command: 'topics:create',
  description: 'creates a topic in Kafka',
  help: `
      Creates a topic in Kafka. Defaults to time-based retention according to plan
      minimum if not explicitly specified.

      Examples:

    $ heroku kafka:topics:create page-visits --partitions 100
    $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --replication-factor 3 --retention-time 10d
    $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --compaction
    `,
  args: [
    {name: 'TOPIC'},
    {name: 'CLUSTER', optional: true}
  ],
  flags: {
    app: flags.app({required: true}),
    partitions: flags.number({description: 'number of partitions to give the topic'}),
    'replication-factor': flags.number({description: 'number of replicas the topic should be created across'}),
    'retention-time': flags.duration({description: 'length of time messages in the topic should be retained (at least 24h)'}),
    compaction: flags.boolean({description: 'whether to use compaction for this topic'})
  }
})
