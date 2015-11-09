var cli = require('heroku-cli-util');
var co = require('co');
var HerokuKafkaResource = require('./resource.js').HerokuKafkaResource;
var Spinner = require('node-spinner');

function addonInfoWithName(addonInfo, name) {
  return addonInfo.info.filter(function (field) {
    return field.name == name;
  })[0];
}

function* kafkaWait (context, heroku) {
  var finished = false;
  var s = Spinner();
  var startTime = new Date().getTime() / 1000;
  var ticks = 0;
  while (!finished) {
    var info = yield new HerokuKafkaResource(heroku, process.env, context).info();
    var nodeStatuses = addonInfoWithName(info, 'Status').values[0].split("\n");
    var availableNodes = nodeStatuses.filter(function (nodeStatus) { return nodeStatus.endsWith('available'); });
    if (nodeStatuses.length === availableNodes.length) {
      finished = true;
      if (ticks === 0) {
        process.stdout.write("all kafka nodes already available, no waiting required");
      } else {
        var finishedTime = new Date().getTime() / 1000;
        process.stdout.write("\rfinished in " +  (finishedTime - startTime).toFixed(1) + " seconds");
      }
    } else {
      process.stdout.write("\r \033[36mwaiting\033[m " + s.next());
      ticks += 1;
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
