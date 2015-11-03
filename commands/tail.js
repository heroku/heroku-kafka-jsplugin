'use strict';

let zookeeper = require("node-zookeeper-client");
let kafkaesque = require('kafkaesque');
let cli = require('heroku-cli-util');
let co = require('co');
let TopicList = require("./topics").TopicList;

function* tail(context, heroku) {
  let config = yield heroku.apps(context.app).configVars().info();
  let kafkaURL = config['HEROKU_KAFKA_URL'].replace(/kafka:\/\//g,'');
  let topicName = context.flags.topic;

  let zookeeperURL = config['HEROKU_KAFKA_ZOOKEEPER_URL'].replace(/zookeeper:\/\//g,'');

  let zookeeperClient = zookeeper.createClient(zookeeperURL);
  zookeeperClient.once('connected', function () {
    new TopicList(zookeeperClient).getTopicPartitions(topicName, function (_, partitionsAndReplicas) {
      let brokers = [kafkaURL.split(",").map(function (url) { var split = url.split(':'); return { host: split[0], port: split[1] }; })[0]];
      var partitions = Object.keys(partitionsAndReplicas);

      let kafkaClient = kafkaesque({
        brokers: brokers,
        clientId: "heroku-cli",
        maxBytes: 2000000
      });

      kafkaClient.tearUp(function (error) {
        if (error) {
          cli.error(error);
          zookeeperClient.close();
          process.exit(1);
        }


        for(var i = 0; i < partitions.length; i++) {
          var partition = parseInt(partitions[i], 10);

          kafkaClient.poll({topic: topicName, partition: partition}, function (err, kafka) {
            if (err) {
              cli.error(err);
            }
            kafka.on('message', function(offset, message, commit) {
              process.stdout.write(message.value + '\n');
              setTimeout(function () {
                commit();
              }, 10);
            });
            kafka.on('error', function(error) {
              cli.error(error);
              kafkaClient.tearDown();
            });
          });
        }
        zookeeperClient.close();
      });
    });
  });
  zookeeperClient.connect();
}

module.exports = {
  topic: 'kafka',
  command: 'topics:tail',
  description: 'tails a topic in kafka',
  help: `
    Tails a topic in kafka, printing it to stdout

    Examples:

    $ heroku kafka:topics:tail --topic page_visits
`,
  needsApp: true,
  needsAuth: true,
  flags: [
    {name: 'topic', char: 't', description: 'topic name to tail from', hasValue: true, required: true}
  ],
  run: cli.command(co.wrap(tail))
};
