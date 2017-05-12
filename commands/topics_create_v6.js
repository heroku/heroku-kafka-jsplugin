'use strict'

const cli = require('heroku-cli-util')
const Base = require('cli-engine-command').default
const flags = require('../lib/flags')
const Heroku = require('cli-engine-command/lib/heroku').default
const {vars} = require('cli-engine-command/lib/heroku')
const HerokuClient = require('heroku-client')
const co = require('co')
const Netrc = require('netrc-parser')

let formatIntervalFromMilliseconds = require('../lib/shared').formatIntervalFromMilliseconds
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request
let fetchProvisionedInfo = require('../lib/clusters').fetchProvisionedInfo

const VERSION = 'v0'

class Command extends Base {
  get heroku () {
    if (this._heroku) return this._heroku
    let _heroku = new Heroku(this.out, {preauth: true})
    const netrc = new Netrc()
    let auth = 'Basic ' + new Buffer(netrc.machines[vars.apiHost].login + ':' + _heroku.auth).toString('base64')
    _heroku.requestOptions.headers.authorization = auth
    this._heroku = _heroku
    return this._heroku
  }
}

class TopicCreate extends Command {
  async run () {
    const context = {
      app: this.flags.app,
      args: {TOPIC: this.argv[0], CLUSTER: this.argv[1]},
      flags: this.flags
    }
    let heroku = new HerokuClient(this.heroku.requestOptions)

    let flags = context.flags
    let retentionTimeMillis = flags['retention-time']
    let compaction = flags['compaction'] || false

    await co(withCluster(this.heroku, context.app, context.args.CLUSTER, function * (addon) {
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

exports.default = TopicCreate
TopicCreate.topic = 'kafka'
TopicCreate.command = '_topics:create'
TopicCreate.description = 'creates a topic in Kafka'
TopicCreate.help = `
    Creates a topic in Kafka. Defaults to time-based retention according to plan
    minimum if not explicitly specified.

    Examples:

  $ heroku kafka:topics:create page-visits --partitions 100
  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --replication-factor 3 --retention-time 10d
  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --compaction
  `
TopicCreate.args = [
  {name: 'TOPIC'},
  {name: 'CLUSTER', optional: true}
]
TopicCreate.flags = {
  app: flags.app({required: true}),
  partitions: flags.string({description: 'number of partitions to give the topic'}),
  'replication-factor': flags.string({description: 'number of replicas the topic should be created across'}),
  'retention-time': flags.duration(),
  compaction: flags.boolean({description: 'whether to use compaction for this topic'})
}
