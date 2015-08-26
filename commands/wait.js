'use strict';

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaResource = require('./resource.js').HerokuKafkaResource;

function addonInfoWithName(addonInfo, name) {
  return addonInfo.info.filter(function (field) {
    return field.name == name;
  })[0];
}

function* kafkaWait (context, heroku) {
  var finished = false;
  while (!finished) {
    var info = yield new HerokuKafkaResource(heroku, process.env, context).info();
    var nodeStatuses = addonInfoWithName(info, 'Status').values;
    var availableNodes = nodeStatuses.filter(function (nodeStatus) { return nodeStatus.endsWith('available'); });
    if (nodeStatuses.length === availableNodes.length) {
      console.log("finished");
      finished = true;
    } else {
      console.log("waiting for nodes to be available");
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
