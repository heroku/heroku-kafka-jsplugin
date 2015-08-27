'use strict';

let zookeeper = require("node-zookeeper-client");
let cli = require('heroku-cli-util');
let co = require('co');

class TopicList {
  constructor(client) {
    this.client = client;
  }
  list(callback) {
    var that = this;
    var out = {};
    that.listTopics(function (topics) {
      for (var i = 0; i < topics.length; i++) {
        var topicName = topics[i];
        var remainingTopics = topics.length;
        var remainingPartitions = 0;

        that.getTopicPartitions(topicName, function (topicName, partitionsAndReplicas) {
          remainingTopics--;

          var partitions = Object.keys(partitionsAndReplicas);
          remainingPartitions += partitions.length;

          out[topicName] = {
            partitions : partitionsAndReplicas,
            partitionStates : {}
          };

          for (var j = 0; j < partitions.length; j++) {
            var partition = partitions[j];
            that.getPartitionState(topicName, partition, function (topicName, partition, partitionState) {
              out[topicName].partitionStates[partition] = partitionState;
              remainingPartitions--;
              if (remainingTopics === 0 && remainingPartitions === 0) {
                callback(out);
              }
            });
          }
        });
      }
    });
  }

  listTopics(callback) {
    var that = this;
    this.client.getChildren("/brokers/topics", function (error, existingTopics) {
      if (error) {
        that.error(error);
      } else {
        callback(existingTopics);
      }
    });
  }

  getTopicPartitions(topicName, callback) {
    var that = this;
    var path = "/brokers/topics/" + topicName;
    this.client.getData(path, function(error, data) {
      if (error) {
        that.error(error);
      } else {
        callback(topicName, JSON.parse(data.toString('utf-8')).partitions);
      }
    });
  }

  getPartitionState(topicName, partition, callback) {
    var that = this;
    var path = "/brokers/topics/" + topicName + "/partitions/" + partition + "/state";
    this.client.getData(path, function(error, data) {
      if (error) {
        that.error(error);
      } else {
        callback(topicName, partition, JSON.parse(data.toString('utf-8')));
      }
    });
  }

  error(error) {
    cli.error(error);
    this.client.close();
  }
}

function formatTopicData(data) {
  var out = '';
  var topics = Object.keys(data);
  for (var i = 0; i < topics.length; i ++) {
    var topic = topics[i];
    out += "\nTopic:" + topic + "  PartitionCount:" + Object.keys(data[topic].partitions).length;
    var partitions = Object.keys(data[topic].partitions);
    for (var j = 0; j < partitions.length; j ++) {
      var partition = partitions[j];
      out += "\nTopic:" + topic + "  Partition:" + partition + "  Leader: " + data[topic].partitionStates[partition].leader + "  Replicas: " + data[topic].partitions[partition].join(',') + "  Isr:  " + data[topic].partitionStates[partition].isr.join(',');
    }
    out += "\n";
  }
  return out;
}

function* listTopics (context, heroku) {
  let config = yield heroku.apps(context.app).configVars().info();
  let zookeeperURL = config['HEROKU_KAFKA_ZOOKEEPER_URL'].replace(/zk:\/\//g,'');

  let client = zookeeper.createClient(zookeeperURL);
  client.once('connected', function () {
    new TopicList(client).list(function (data) {
      console.log(formatTopicData(data));
      client.close();
    });
  });
  client.connect();
}

module.exports = {
  topic: 'kafka',
  command: 'topics:list',
  description: 'lists available kafka topics, including their replicas and partitions',
  help: `
    Lists available kafka topics with information on replicas and partitions for each.

    Examples:

    $ heroku kafka:list-topics
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(listTopics))
};
