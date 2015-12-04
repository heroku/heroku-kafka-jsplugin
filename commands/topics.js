'use strict';
let cli = require('heroku-cli-util');

class TopicList {
  constructor(client) {
    this.client = client;
  }
  list(callback) {
    var that = this;
    var out = {};
    that.listTopics(function (topics) {
      if (topics.length === 0) {
        console.log("No topics found");
        that.finished();
      }
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
    var path = `/brokers/topics/${topicName}`;
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
    var path = `/brokers/topics/${topicName}/partitions/${partition}/state`;
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

  finished() {
    this.client.close();
  }
}

module.exports = {
  TopicList: TopicList
};
