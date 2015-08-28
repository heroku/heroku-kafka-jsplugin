'use strict';

let zookeeper = require("node-zookeeper-client");
let cli = require('heroku-cli-util');
let co = require('co');
let TopicList = require("./topics").TopicList;

function formatTopicData(data) {
  var out = '';
  var topics = Object.keys(data);
  for (var i = 0; i < topics.length; i ++) {
    var topic = topics[i];
    out += "\nTopic:" + topic + "  PartitionCount:" + Object.keys(data[topic].partitions).length;
    var partitions = Object.keys(data[topic].partitions);
    for (var j = 0; j < partitions.length; j ++) {
      var partition = partitions[j];
      out += `\nTopic:${topic}  Partition:${partition}  Leader: ${data[topic].partitionStates[partition].leader}  Replicas: ${data[topic].partitions[partition].join(',')}  Isr:  ${data[topic].partitionStates[partition].isr.join(',')}`;
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

    $ heroku kafka:topics:list
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(listTopics))
};
