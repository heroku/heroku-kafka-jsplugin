'use strict';

let zookeeper = require("node-zookeeper-client");
let cli = require('heroku-cli-util');
let co = require('co');

function* createTopic (context, heroku) {
    let config = yield heroku.apps(context.app).configVars().info();
    let zookeeperURL = config['HEROKU_KAFKA_ZOOKEEPER_URL'].replace(/zk:\/\//g,'');
    let topicName = context.flags.topic;

    let data = {version:1, partitions: {"0":[1]}};

    let client = zookeeper.createClient(zookeeperURL);
    client.once('connected', function () {
      client.create("/brokers/topics/" + topicName, new Buffer(JSON.stringify(data)), function (error, path) {
        if (error) {
          cli.error(error);
        } else {
          console.info("created topic ", topicName);
        }
        client.close()
      });
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
