'use strict';

const cli = require('heroku-cli-util');
const co = require('co');
const kafka = require('no-kafka');

const CLIENT_ID = 'heroku-tail-consumer';
const IDLE_TIMEOUT = 1000;

module.exports = {
  topic: 'kafka',
  command: 'tail',
  description: 'Tails a topic in Kafka',
  help: `
    Tails a topic in Kafka.

    Examples:

    $ heroku kafka:tail page-visits
`,
  needsApp: true,
  needsAuth: true,
  args: [{ name: 'TOPIC', optional: false }],
  run: cli.command(co.wrap(tail))
};

function* tail(context, heroku) {
  let config = yield heroku.apps(context.app).configVars().info();
  if (!config.KAFKA_URL || !config.KAFKA_CLIENT_CERT || !config.KAFKA_CLIENT_CERT_KEY) {
    cli.error('No Kafka addon found');
    process.exit();
  }
  let consumer = new kafka.SimpleConsumer({
    idleTimeout: IDLE_TIMEOUT,
    clientId: CLIENT_ID,
    connectionString: config.KAFKA_URL,
    ssl: {
      clientCert: config.KAFKA_CLIENT_CERT,
      clientCertKey: config.KAFKA_CLIENT_CERT_KEY
    }
  });
  yield consumer.init();
  consumer.subscribe(context.args.TOPIC, 0, (messageSet, topic, partition) => {
    messageSet.forEach((m) => {
      console.log(context.args.TOPIC, partition, m.offset, m.message.value.toString('utf8'));
    });
  });
}
