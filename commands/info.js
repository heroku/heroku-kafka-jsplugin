'use strict';

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
let _ = require('underscore');

function* kafkaInfo (context, heroku) {
  var infos = yield new HerokuKafkaClusters(heroku, process.env, context).info(context.args.CLUSTER);
  if (infos) {
    _.each(infos, function(info) {
      cli.styledHeader(info.attachment_name || 'HEROKU_KAFKA');
      console.log();
      cli.styledNameValues(info.info);
    });
  } else {
    process.exit(1);
  }
}

module.exports = {
  topic: 'kafka',
  command: 'info',
  default: true,
  description: 'Shows information about the state of your Kafka cluster',
  args: [
    {
      name: 'CLUSTER',
      optional: true
    }
  ],
  help: `
    Shows information about the state of your Heroku Kafka cluster.

    Examples:

    $ heroku kafka:info
    $ heroku kafka:info HEROKU_KAFKA_BROWN_URL
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaInfo))
};
