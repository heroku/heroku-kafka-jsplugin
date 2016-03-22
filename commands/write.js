'use strict';

let kafkaesque = require('kafkaesque');
let cli = require('heroku-cli-util');
let co = require('co');

function* write(context, heroku) {
  let config = yield heroku.apps(context.app).configVars().info();
  let kafkaURL = config['HEROKU_KAFKA_URL'].replace(/kafka:\/\//g,'');
  let topicName = context.args.TOPIC;
  let partition = context.flags.partition || 0;
  let message = context.args.message;


  let brokers = [kafkaURL.split(",").map(function (url) { var split = url.split(':'); return { host: split[0], port: split[1] }; })[0]];

  let kafkaClient = kafkaesque({
    brokers: brokers,
    clientId: "heroku-cli",
    maxBytes: 2000000
  });

  kafkaClient.tearUp(function (error) {
    if (error) {
      cli.error(error);
      process.exit(1);
    }

    kafkaClient.produce({topic: topicName, partition: partition},
                        [message],
                        function(error) {
      kafkaClient.tearDown();
      if (error) {
        cli.error(error);
        process.exit(1);
      } else {
        console.log('successfully sent message to topic');
        process.exit(0);
      }
    });

  });
}

module.exports = {
  topic: 'kafka',
  command: 'topics:write',
  description: 'writes a message to a Kafka topic',
  help: `
    Writes a message to the specified Kafka topic.

    Examples:

    $ heroku kafka:topics:write "1441025138,www.example.com,192.168.2.13" --topic page_visits
`,
  needsApp: true,
  needsAuth: true,
  flags: [
    {name: 'partition', description: 'partition to write to', hasValue: true, optional: true}
  ],
  args: [
    {
      name: 'message',
      required: true,
      hidden:false
    },
    {
      name: 'TOPIC',
      optional: false
    },
    {
      name: 'CLUSTER',
      optional: true
    }
  ],
  run: cli.command(co.wrap(write))
};
