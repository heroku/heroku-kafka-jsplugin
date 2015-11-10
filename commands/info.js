'use strict';

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaResource = require('./resource.js').HerokuKafkaResource;
let columnify = require('columnify');

function* kafkaInfo (context, heroku) {
  var info = yield new HerokuKafkaResource(heroku, process.env, context).info();
  if (info) {
    console.log('=== HEROKU_KAFKA');
    console.log(columnify(info.info, {showHeaders: false, preserveNewLines: true}));
    console.log();
  } else {
    process.exit(1);
  }
}

module.exports = {
  topic: 'kafka',
  command: 'info',
  description: 'shows information about the state of your Heroku Kafka cluster',
  help: `
    Shows the state of your Heroku Kafka cluster.

    Examples:

    $ heroku kafka:info
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaInfo))
};
