'use strict';

let DOT_WAITING_TIME = 200;

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
let sleep = require('co-sleep');

function* printWaitingDots() {
  yield sleep(DOT_WAITING_TIME);
  process.stdout.write('.');
  yield sleep(DOT_WAITING_TIME);
  process.stdout.write('.');
  yield sleep(DOT_WAITING_TIME);
  process.stdout.write('.');
}

function* doFail(context, heroku, clusters) {
  var fail = clusters.fail(context.args.CLUSTER, context.flags.catastrophic, context.flags.zookeeper);
  process.stdout.write('Eenie meenie miney moe');
  yield printWaitingDots();
  process.stdout.write('\n');

  var failResponse = yield fail;
  if (failResponse) {
    process.stdout.write(` ${failResponse.message}`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}


function* fail (context, heroku) {
  var clusters = new HerokuKafkaClusters(heroku, process.env, context);
  var addon = yield clusters.addonForSingleClusterCommand(context.args.CLUSTER);
  if (addon) {
    var confirmed = yield clusters.checkConfirmation(context, `
  !    WARNING: Destructive Action
  !    This command will affect the cluster: ${addon.name}, which is on ${context.app}
  !
  !    This command will forcibly terminate nodes in your cluster at random.
  !    You should only run this command in controlled testing scenarios.
  !
  !    To proceed, type "${context.app}" or re-run this command with --confirm ${context.app}
  `);

    if (confirmed) {
      yield doFail(context, heroku, clusters);
    } else {
      cli.error(`Confirmed app ${context.flags.confirm} did not match the selected app ${context.app}.`);
      process.exit(1);
    }
  } else {
    process.exit(1);
  }
}


module.exports = {
  topic: 'kafka',
  command: 'fail',
  description: 'triggers failure on one node in the cluster',
  help: `
    Triggers failure on one node in the cluster.

    Examples:

    $ heroku kafka:fail
    $ heroku kafka:fail HEROKU_KAFKA_BROWN_URL
`,
  needsApp: true,
  needsAuth: true,
  args: [
    {
      name: 'CLUSTER',
      optional: true
    }
  ],
  flags: [
    {name: 'catastrophic',
     description: 'induce unrecoverable server failure on the single node',
     hasValue: false},
    {name: 'zookeeper',
     description: 'induce failure on zookeeper node rather than on Kafka itself',
     hasValue: false},
    {name: 'confirm',
     description: 'Override the confirmation prompt. Needs the app name, or the command will fail.',
     hasValue: true}
  ],
  run: cli.command(co.wrap(fail))
};
