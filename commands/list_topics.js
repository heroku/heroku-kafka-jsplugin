'use strict';

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;

function* listTopics (context, heroku) {
  var topics = yield new HerokuKafkaClusters(heroku, process.env, context).topics(context.args.CLUSTER);
  if (topics) {
    cli.styledHeader('Kafka Topics on ' + (topics.attachment_name || 'HEROKU_KAFKA'));
    console.log();
    cli.table(topics.topics,
      {
        columns:
        [
          {key: 'name', label: 'Name'},
          {key: 'messages', label: 'Messages'},
          {key: 'bytes', label: 'Traffic'}
        ]
      }
    );
  } else {
    process.exit(1);
  }
}

module.exports = {
  topic: 'kafka',
  command: 'list',
  description: 'lists available kafka topics, including their replicas and partitions',
  help: `
    Lists available kafka topics with information on replicas and partitions for each.

    Examples:

    $ heroku kafka:topics:list
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(listTopics))
};
