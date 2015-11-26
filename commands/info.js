'use strict';

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
let columnify = require('columnify');
let _ = require('underscore');

function* kafkaInfo (context, heroku) {
  var infos = yield new HerokuKafkaClusters(heroku, process.env, context).info(context.args.CLUSTER);
  if (infos) {
    _.each(infos, function(info) {
      console.log('=== ' + (info.attachment_name || 'HEROKU_KAFKA'));
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
  default: true,
  description: 'shows information about the state of your Heroku Kafka cluster',
  args: [
    {
      name: 'CLUSTER',
      optional: true
    }
  ],
  help: `
    Shows the state of your Heroku Kafka cluster.

    Examples:

    $ heroku kafka:info
    $ heroku kafka:info kafka-adjacent-1337
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaInfo))
};
