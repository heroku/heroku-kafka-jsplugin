'use strict';

let FLAGS = [
  {name: 'partitions',          char: 'p', description: 'number of partitions to give the topic',                            hasValue: true,  optional: false},
  {name: 'replication-factor',  char: 'r', description: 'number of replicas the topic should be created across',             hasValue: true,  optional: true},
  {name: 'retention-time',      char: 't', description: 'The length of time messages in the topic should be retained for.',  hasValue: true,  optional: true},
  {name: 'compaction',          char: 'c', description: 'Whether to use compaction for this topi',                           hasValue: false, optional: true}
];

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
  yield sleep(10);
  process.stdout.write('.');
  yield sleep(10);
  process.stdout.write('.');
  yield sleep(10);
  process.stdout.write('.');
}

function* createTopic (context, heroku) {
  process.stdout.write(`Creating ${context.args.TOPIC} on context.args.CLUSTER}`);
  var flags = extractFlags(context.flags);
  var creation = new HerokuKafkaClusters(heroku, process.env, context).create(context.args.CLUSTER, context.args.TOPIC, flags);
  yield printWaitingDots();

  var err = yield creation;

  if (err) {
    cli.error(err);
  } else {
    process.stdout.write('done.\n');
    // TODO: once we have heroku kafka:topic, we'll document using it here.
  }
}


module.exports = {
  topic: 'kafka',
  command: 'create',
  description: 'Creates a topic in kafka',
  help: `
    Creates a topic in Kafka.

    Examples:

    $ heroku kafka:topics:create --partitions 100 --topic page_visits
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
  run: cli.command(co.wrap(createTopic))
};
