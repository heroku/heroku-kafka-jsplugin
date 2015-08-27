'use strict';

let zookeeper = require("node-zookeeper-client");
let cli = require('heroku-cli-util');
let co = require('co');
let PartitionPlan = require('./partition_plan').PartitionPlan;
let checkValidTopicName = require('./shared').checkValidTopicName;

class ZookeeperTopicAdmin {
  constructor(client) {
    this.client = client;
  }
  createTopic(topicName, partitionCount) {
    var that = this;
    this.getPartitionPlan(partitionCount, function (partitionPlan) {
      that.writeNewTopic(topicName, partitionPlan);
    });
  }
  getPartitionPlan(partitionCount, callback) {
    this.getBrokers(function (brokers) {
      callback(PartitionPlan.fromBrokers(brokers, partitionCount));
    });
  }
  getBrokers(callback) {
    this.client.getChildren("/brokers/ids", function (error, children) {
      if (error) {
        this.error(error);
      } else {
        callback(children.map(function (brokerId) { return parseInt(brokerId, 10); }));
      }
    });
  }
  writeNewTopic(topicName, partitionPlan) {
    var that = this;
    let data = {version:1, partitions: partitionPlan};
    this.client.create(`/brokers/topics/${topicName}`, new Buffer(JSON.stringify(data)), function (error) {
      if (error) {
        that.error(error);
      } else {
        console.info("created topic ", topicName);
        that.finished();
      }
    });
  }
  error(error) {
    cli.error(error);
    this.finished();
  }
  finished() {
    this.client.close();
  }
}

function* createTopic (context, heroku) {
  let config = yield heroku.apps(context.app).configVars().info();
  let zookeeperURL = config['HEROKU_KAFKA_ZOOKEEPER_URL'].replace(/zk:\/\//g,'');
  let topicName = context.flags.topic;
  let partitionCount = context.flags.partitions;

  if (partitionCount <= 1) {
    cli.error(`--partitions must be provided and a number, but was ${partitionCount}`);
    process.exit(1);
  }

  let client = zookeeper.createClient(zookeeperURL);
  client.once('connected', function () {
    client.getChildren("/brokers/topics", function (error, existingTopics) {
      let validTopic = checkValidTopicName(topicName, existingTopics);
      if (validTopic.invalid) {
        cli.error(`topic name ${topicName} was invalid: ${validTopic.message}`);
        client.close();
        process.exit(1);
      } else {
        new ZookeeperTopicAdmin(client).createTopic(topicName, partitionCount);
      }
    });
  });
  client.connect();
}

module.exports = {
  topic: 'kafka',
  command: 'topics:create',
  description: 'creates a topic in kafka',
  help: `
    Creates a topic in Kafka.

    Examples:

    $ heroku kafka:create-topic --partitions 100 --topic page_visits
`,
  needsApp: true,
  needsAuth: true,
  flags: [
    {name: 'topic', char: 't', description: 'topic name to create', hasValue: true, optional: false},
    {name: 'partitions', char: 'p', description: 'number of partitions to give the topic', hasValue: true, optional: false}
  ],
  run: cli.command(co.wrap(createTopic))
};
