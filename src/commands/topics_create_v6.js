// @flow

import Command from 'cli-engine-command'
import {StringFlag, BooleanFlag} from 'cli-engine-command'
import {AppFlag} from 'cli-engine-command/lib/flags/app'

let appParser = function (app) {
  return new Promise(resolve => resolve(`${app}-test`))
}

export default class extends Command {
  static topic = 'kafka'
  static command = '_topics:create'
  static description = 'creates a topic in Kafka'
  static help = `
    Creates a topic in Kafka. Defaults to time-based retention according to plan
    minimum if not explicitly specified.

    Examples:

  $ heroku kafka:topics:create page-visits --partitions 100
  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --replication-factor 3 --retention-time 10d
  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --compaction
  `
  static args = [
    { name: 'TOPIC' },
    { name: 'CLUSTER', optional: true }
  ]
  static flags = {
    app: AppFlag({required: true, parse: appParser}),
    partitions: StringFlag({description: 'number of partitions to give the topic'}),
    'replication-factor': StringFlag({description: 'number of replicas the topic should be created across'}),
    'retention-time': StringFlag({description: 'length of time messages in the topic should be retained (at least 24h)'}),
    compaction: BooleanFlag({description: 'whether to use compaction for this topic'})
  }

  async run (args) {
    this.out.log(`running create... for ${this.flags.app}`)
  }
}
