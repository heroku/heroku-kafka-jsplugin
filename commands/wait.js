var cli = require('heroku-cli-util');
var co = require('co');
var sleep = require('co-sleep');
var HerokuKafkaResource = require('./resource.js').HerokuKafkaResource;
var Spinner = require('node-spinner');

function* kafkaWait (context, heroku) {
  var finished = false;
  var s = Spinner();
  while (!finished) {
    var waitStatus = yield new HerokuKafkaResource(heroku, process.env, context).waitStatus();
    if (!waitStatus['waiting?']) {
      finished = true;
    } else {
      process.stdout.write("\r \033[36m" + waitStatus.message + "\033[m " + s.next());
      yield sleep(500);
    }
  }
}

module.exports = {
  topic: 'kafka',
  command: 'wait',
  description: 'waits until all kafka resources are available',
  help: `
    Waits until all the kafka brokers are available.

    Examples:

    $ heroku kafka:wait
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaWait))
};
