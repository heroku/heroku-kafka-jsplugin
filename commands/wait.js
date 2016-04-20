var cli = require('heroku-cli-util');
var co = require('co');
var sleep = require('co-sleep');
var HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters;
var Spinner = require('node-spinner');

function* kafkaWait (context, heroku) {
  var finished = false;
  var s = Spinner();
  var addon = yield new HerokuKafkaClusters(heroku, process.env, context).addonForSingleClusterCommand(context.args.CLUSTER);
  if (addon) {
    while (!finished) {
      var waitStatus = yield new HerokuKafkaClusters(heroku, process.env, context).waitStatus(addon);
      if (!waitStatus || !waitStatus['waiting?']) {
        finished = true;
      } else {
        process.stdout.write("\r \033[36m" + waitStatus.message + "\033[m " + s.next());
        yield sleep(500);
      }
    }
  } else {
    process.exit(1);
  }
}

module.exports = {
  topic: 'kafka',
  command: 'wait',
  description: 'Waits until Kafka is ready to use',
  args: [
    {
      name: 'CLUSTER',
      optional: true
    }
  ],
  help: `
    Waits until Kafka is ready to use.

    Examples:

    $ heroku kafka:wait
    $ heroku kafka:wait HEROKU_KAFKA_BROWN_URL
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaWait))
};
