'use strict';

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
let _ = require('underscore');

function* kafkaTopic (context, heroku) {
  var topic = yield new HerokuKafkaClusters(heroku, process.env, context).topic(context.args.CLUSTER, context.args.TOPIC);
  if (topic) {
    cli.styledHeader((topic.attachment_name || 'HEROKU_KAFKA') + ' :: ' + topic.topic);
    console.log();
    var out = {};
    _.each(topic.info, function(infoLine) {
      out[infoLine.name] = infoLine.values;
    });
    cli.styledHash(out);
  } else {
    process.exit(1);
  }
}

module.exports = {
  topic: 'kafka',
  command: 'topic',
  description: 'Shows information about a topic in kafka',
  args: [
    {
      name: 'TOPIC',
      optional: false
    },
    {
      name: 'CLUSTER',
      optional: true
    }
  ],
  help: `
    Shows information about a topic in your kafka cluster

    Examples:

    $ heroku kafka:info page-visits
    $ heroku kafka:info page-visits HEROKU_KAFKA_BROWN_URL
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaTopic))
};
