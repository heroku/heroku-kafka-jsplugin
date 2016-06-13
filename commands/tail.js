'use strict';

const cli = require('heroku-cli-util');
const co = require('co');
const kafka = require('no-kafka');

const HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
const clusterConfig = require('./shared.js').clusterConfig;

const CLIENT_ID = 'heroku-tail-consumer';
const IDLE_TIMEOUT = 1000;
const MAX_LENGTH = 80;

function* tail(context, heroku) {
  let clusters = new HerokuKafkaClusters(heroku, process.env, context);
  let addon = yield clusters.addonForSingleClusterCommand(context.args.CLUSTER);
  if (!addon) {
    process.exit(1);
  }
  let appConfig = yield heroku.apps(context.app).configVars().info();
  let config = clusterConfig(addon, appConfig);

  let consumer = new kafka.SimpleConsumer({
    idleTimeout: IDLE_TIMEOUT,
    clientId: CLIENT_ID,
    connectionString: config.url,
    ssl: {
      clientCert: config.clientCert,
      clientCertKey: config.clientCertKey
    }
  });
  try {
    yield consumer.init();
  } catch (e) {
    cli.error("Could not connect to kafka");
    cli.debug(e);
    process.exit(1);
  }

  try {
    consumer.subscribe(context.args.TOPIC, (messageSet, topic, partition) => {
      messageSet.forEach((m) => {
        let buffer = m.message.value;
        if (buffer == null) {
          console.log(context.args.TOPIC, partition, m.offset, 0, "NULL");
          return;
        }
        let length = Math.min(buffer.length, MAX_LENGTH);
        let body = buffer.toString('utf8', 0, length);
        console.log(context.args.TOPIC, partition, m.offset, buffer.length, body);
      });
    });
  } catch (e) {
    cli.error("Could not subscribe to topic");
    cli.debug(e);
    process.exit(1);
  }
}

module.exports = {
  topic: 'kafka',
  command: 'tail',
  description: 'tails a topic in Kafka',
  args: [
    { name: 'TOPIC', optional: false },
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Tails a topic in Kafka.

    Examples:

    $ heroku kafka:tail page-visits
    $ heroku kafka:tail page-visits kafka-aerodynamic-32763
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(tail))
};
