'use strict';

let zookeeper = require("node-zookeeper-client");
let cli = require('heroku-cli-util');
let co = require('co');
let PartitionPlan = require('./partition_plan').PartitionPlan;

let ZookeeperTopicAdmin = function (client) {
  this.client = client;
};

ZookeeperTopicAdmin.prototype.createTopic = function (topicName) {
  var that = this;
  this.getPartitionPlan(function (partitionPlan) {
    that.writeNewTopic(topicName, partitionPlan);
  });
};

ZookeeperTopicAdmin.prototype.getPartitionPlan = function (callback) {
  this.getBrokers(function (brokers) {
    console.log(brokers);
    let partitionCount = 100; // TODO: stop hardcoding this
    callback(PartitionPlan.fromBrokers(brokers, partitionCount));
  });
};

ZookeeperTopicAdmin.prototype.getBrokers = function (callback) {
  this.client.getChildren("/brokers/ids", function (error, children) {
    if (error) {
      this.error(error);
    } else {
      callback(children.map(function (brokerId) { return parseInt(brokerId, 10); }));
    }
  });
};

ZookeeperTopicAdmin.prototype.writeNewTopic = function (topicName, partitionPlan) {
  var that = this;
  let data = {version:1, partitions: partitionPlan};
  this.client.create("/brokers/topics/" + topicName, new Buffer(JSON.stringify(data)), function (error, path) {
    if (error) {
      that.error(error);
    } else {
      console.info("created topic ", topicName);
      that.finished();
    }
  });
};

ZookeeperTopicAdmin.prototype.error = function (error) {
  cli.error(error);
  this.finished();
};

ZookeeperTopicAdmin.prototype.finished = function () {
  this.client.close();
};

function* createTopic (context, heroku) {
    let config = yield heroku.apps(context.app).configVars().info();
    let zookeeperURL = config['HEROKU_KAFKA_ZOOKEEPER_URL'].replace(/zk:\/\//g,'');
    let topicName = context.flags.topic;

    let client = zookeeper.createClient(zookeeperURL);
    client.once('connected', function () {
      new ZookeeperTopicAdmin(client).createTopic(topicName);
    });
    client.connect();
}

module.exports = {
  topic: 'kafka',
  command: 'create-topic',
  description: 'creates a topic in kafka',
  help: '',
  needsApp: true,
  needsAuth: true,
  flags: [
    {name: 'topic', char: 't', description: 'topic name to create', hasValue: true, optional: false}
  ],
  run: cli.command(co.wrap(createTopic)),
}
