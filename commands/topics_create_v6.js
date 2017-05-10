'use strict';

const Command = require('cli-engine-command').default
const flags = require('../lib/flags')

class TopicCreate extends Command {
  async run(args) {
    this.out.log(`running create with retention-time: ${this.flags['retention-time']} ms`)
  }
}

exports.default = TopicCreate
TopicCreate.topic = 'kafka'
TopicCreate.command = '_topics:create';
TopicCreate.description = 'creates a topic in Kafka'
TopicCreate.help = `
    Creates a topic in Kafka. Defaults to time-based retention according to plan
    minimum if not explicitly specified.

    Examples:

  $ heroku kafka:topics:create page-visits --partitions 100
  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --replication-factor 3 --retention-time 10d
  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --compaction
  `;
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
