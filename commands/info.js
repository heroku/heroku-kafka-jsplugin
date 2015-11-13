'use strict';

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
let columnify = require('columnify');
let _ = require('underscore');

function* kafkaInfo (context, heroku) {
  var infos = yield new HerokuKafkaClusters(heroku, process.env, context).info();
  if (infos) {
    _.each(infos, function(info) {
      console.log('=== HEROKU_KAFKA');
      console.log(columnify(info.info, {showHeaders: false, preserveNewLines: true}));
      console.log();
    });
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
