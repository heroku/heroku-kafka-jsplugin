'use strict';

const Command = require('cli-engine-command').default
const AppFlag = require('cli-engine-command/lib/flags/app').AppFlag
const BooleanFlag = require('cli-engine-command/lib/flags/boolean').default
const StringFlag = require('cli-engine-command/lib/flags/string').default

const DurationFlag = require('../lib/flags/duration')

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
  app: AppFlag({ required: true}),
  partitions: StringFlag({ description: 'number of partitions to give the topic' }),
  'replication-factor': StringFlag({ description: 'number of replicas the topic should be created across' }),
  'retention-time': DurationFlag({ description: 'length of time messages in the topic should be retained (at least 24h)' }),
  compaction: BooleanFlag({ description: 'whether to use compaction for this topic' })
}
