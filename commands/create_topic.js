'use strict';

let FLAGS = [
  {name: 'partitions',          description: 'number of partitions to give the topic',                                            hasValue: true,  optional: false},
  {name: 'replication-factor',  description: 'number of replicas the topic should be created across',                             hasValue: true,  optional: true},
  {name: 'retention-time',      description: 'the length of time messages in the topic should be retained for in milliseconds.',  hasValue: true,  optional: true},
  {name: 'compaction',          description: 'whether to use compaction for this topic',                                          hasValue: false, optional: true},
  {name: 'confirm',             description: 'override the confirmation prompt. Needs the app name, or the command will fail.',   hasValue: true, optional: true}
];
let DOT_WAITING_TIME = 200;

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
let parseDuration = require('./shared').parseDuration;
let sleep = require('co-sleep');
let _ = require('underscore');

function extractFlags(contextFlags) {
  // This just ensures that we only ever get the flags we expect,
  // and don't get any additional keys out of the heroku cli flags object
  // (if there happen to be any).
  var out = {};
  _.each(FLAGS, function (flag) {
    let value = contextFlags[flag.name];
    if (value !== undefined) {
      if (flag.name === 'retention-time') {
        let parsed = parseDuration(value);
        if (value == null) {
          cli.error(`could not parse retention time '${value}'`);
          process.exit(1);
        }
        value = parsed;
      }
      out[flag.name] = value;
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

function* createTopic (context, heroku) {
  var clusters = new HerokuKafkaClusters(heroku, process.env, context);
  var addon = yield clusters.addonForSingleClusterCommand(context.args.CLUSTER);
  if (addon) {
    if (context.flags['replication-factor'] === '1') {
      var confirmed = yield clusters.checkConfirmation(context, `
    !    WARNING: Dangerous Action
    !    This command will create a topic with no replication on the cluster: ${addon.name}, which is on ${context.app}
    !    Data written to this topic will be lost if any single broker suffers catastrophic failure.
    !
    !    To proceed, type "${context.app}" or re-run this command with --confirm ${context.app}
    `);

      if (confirmed) {
        console.log(`
    !    Proceeding to create a non-replicated topic...
    `);
        yield doCreation(context, heroku, clusters);
      } else {
        process.exit(1);
      }
    } else {
      yield doCreation(context, heroku, clusters);
    }
  } else {
    process.exit(1);
  }
}

function* doCreation(context, heroku, clusters) {
  if (context.args.CLUSTER) {
    process.stdout.write(`Creating ${context.args.TOPIC} on ${context.args.CLUSTER}`);
  } else {
    process.stdout.write(`Creating ${context.args.TOPIC}`);
  }
  var flags = extractFlags(context.flags);

  var creation = clusters.createTopic(context.args.CLUSTER, context.args.TOPIC, flags);
  yield printWaitingDots();

  var err = yield creation;

  if (err) {
    process.stdout.write("\n");
    cli.error(err);
    process.exit(1);
  } else {
    process.stdout.write(' done.\n');
    process.stdout.write(`Use \`heroku kafka:topic ${context.args.TOPIC}\` to monitor your topic.\n`);
  }
}

module.exports = {
  topic: 'kafka',
  command: 'create',
  description: 'creates a topic in Kafka',
  help: `
    Creates a topic in Kafka.

    Examples:

    $ heroku kafka:create page-visits --partitions 100
    $ heroku kafka:create HEROKU_KAFKA_BROWN_URL page-visits --partitions 100 --replication-factor 3 --retention-time '1 day' --compaction
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
