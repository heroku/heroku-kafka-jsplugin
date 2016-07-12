'use strict';

let FLAGS = [
  {name: 'version',
    description: 'requested kafka version for upgrade',
    hasValue: true},
  {name: 'confirm',
    description: 'Override the confirmation prompt. Needs the app name, or the command will fail.',
    hasValue: true}
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

function* upgradeCluster (context, heroku) {
  var clusters = new HerokuKafkaClusters(heroku, process.env, context);
  var addon = yield clusters.addonForSingleClusterCommand(context.args.CLUSTER);

  if (!addon) {
    process.exit(1);
  }

  var flags = extractFlags(context.flags);

  console.log('flags', JSON.stringify(flags));

  if (flags.version === undefined) {
    cli.error("The --version flag is not optional");
    process.exit(1);
  }

  var confirmed = yield clusters.checkConfirmation(context, `
  !    WARNING: Dangerous Action
  !    This command will upgrade the brokers of the cluster to version ${flags.version}.
  !
  !    To proceed, type "${context.app}" or re-run this command with --confirm ${context.app}
  `);

  if (!confirmed) {
    process.exit(1);
  }

  if (context.args.CLUSTER) {
    process.stdout.write(`Upgrading ${context.args.CLUSTER} to version ${flags.version}`);
  } else {
    process.stdout.write(`Upgrading to version ${flags.version}`);
  }

  var upgrade = clusters.upgrade(context.args.CLUSTER, flags);
  yield printWaitingDots();

  var err = yield upgrade;

  if (err) {
    process.stdout.write("\n");
    cli.error(err);
    process.exit(1);
  } else {
    process.stdout.write(' done.\n');
    process.stdout.write(`Use \`heroku kafka:info\` to monitor the upgrade.\n`);
  }
}

module.exports = {
  hidden: true,
  topic: 'kafka',
  command: 'upgrade',
  description: 'upgrades kafka broker version',
  help: `
    Upgrades the version running on the brokers

    Example:

    $ heroku kafka:upgrade --version 0.9
`,
  needsApp: true,
  needsAuth: true,
  args: [
    {
      name: 'CLUSTER',
      optional: true
    }
  ],
  flags: FLAGS,
  run: cli.command(co.wrap(upgradeCluster))
};
