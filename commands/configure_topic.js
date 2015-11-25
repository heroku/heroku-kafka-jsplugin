'use strict';

let FLAGS = [
  {name: 'retention-time',      char: 't', description: 'The length of time messages in the topic should be retained for.',  hasValue: true,  optional: true},
  {name: 'compaction',          char: 'c', description: 'Whether to use compaction for this topi',                           hasValue: false, optional: true}
];
let DOT_WAITING_TIME = 200;

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
let sleep = require('co-sleep');
let _ = require('underscore');

function extractFlags(contextFlags) {
  // This just ensures that we only ever get the flags we expect,
  // and don't get any additional keys out of the heroku cli flags object
  // (if there happen to be any).
  var out = {};
  _.each(FLAGS, function (flag) {
    if (contextFlags[flag.name] !== undefined) {
      out[flag.name] = contextFlags[flag.name];
    }
  });
  return out;
}

function* printWaitingDots() {
  yield sleep(DOT_WAITING_TIME);
  process.stdout.write('.');
  yield sleep(DOT_WAITING_TIME);
  process.stdout.write('.');
  yield sleep(DOT_WAITING_TIME);
  process.stdout.write('.');
}

function* configureTopic (context, heroku) {
  if (context.args.CLUSTER) {
    process.stdout.write(`Configuring ${context.args.TOPIC} on ${context.args.CLUSTER}`);
  } else {
    process.stdout.write(`Configuring ${context.args.TOPIC}`);
  }
  var flags = extractFlags(context.flags);
  var creation = new HerokuKafkaClusters(heroku, process.env, context).configureTopic(context.args.CLUSTER, context.args.TOPIC, flags);
  yield printWaitingDots();

  var err = yield creation;

  if (err) {
    process.stdout.write("\n");
    cli.error(err);
  } else {
    process.stdout.write(' done.\n');
    process.stdout.write(`Use \`heroku kafka:topic ${context.args.TOPIC}\` to monitor your topic`);
  }
}

module.exports = {
  topic: 'kafka',
  command: 'configure',
  description: 'Configures a topic in kafka',
  help: `
    Configures a topic in Kafka.

    Examples:

    $ heroku kafka:configure page-visits --retention-time 86400000
    $ heroku kafka:configure HEROKU_KAFKA_BROWN_URL page-visits --partitions 100 --replication-factor 3 --retention-time 86400000 --compaction
`,
  needsApp: true,
  needsAuth: true,
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
  flags: FLAGS,
  run: cli.command(co.wrap(configureTopic))
};
