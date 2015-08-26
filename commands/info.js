'use strict';

let cli = require('heroku-cli-util');
let co = require('co');

let VERSION = "v0";

function addonInfoWithName(addonInfo, name) {
  return addonInfo.info.filter(function (field) {
    return field.name == name;
  })[0];
}

function formatInfo(addonInfo) {
  var out = ["=== HEROKU_KAFKA"];
  out.push("Name:    " + addonInfoWithName(addonInfo, 'Name').values[0]);
  out.push("Created: " + addonInfoWithName(addonInfo, 'Created').values[0]);
  out.push("Plan:    " + addonInfoWithName(addonInfo, 'Plan').values[0]);
  var nodes = addonInfoWithName(addonInfo, 'Status').values;
  var firstNode = nodes.shift();
  out.push("Status:  " + firstNode);
  nodes.forEach(function (node) {
    out.push("         " + node);
  });
  return out.join("\n");
}

function HerokuKafkaResource(heroku, env, context) {
  this.heroku = heroku;
  this.env = env;
  this.context = context;
  this.app = context.app;
}

HerokuKafkaResource.prototype.info = function* () {
  var addon = yield this.addon();
  var response = yield this.heroku.request({
    host: this.host(),
    path: `/client/kafka/${VERSION}/clusters/${addon.name}`,
    auth: `${this.context.auth.username}:${this.context.auth.password}`,
    headers: {
      'Accept': 'application/json'
    }
  });
  return response;
};

HerokuKafkaResource.prototype.host = function () {
  if (this.env.SHOGUN) {
    return "shogun-" + this.env.SHOGUN + ".herokuapp.com";
  } else {
    return "postgres-api.heroku.com";
  }
};

HerokuKafkaResource.prototype.addon = function* () {
  let availableAddons = yield this.heroku.apps(this.app).addons().listByApp();
  let kafkaAddon = availableAddons.filter(function (addon) { return addon.addon_service.name === 'heroku-kafka'; });
  return kafkaAddon[0];
};


function* kafkaInfo (context, heroku) {
  var info = yield new HerokuKafkaResource(heroku, process.env, context).info();
  console.log(formatInfo(info));
}

module.exports = {
  topic: 'kafka',
  command: 'info',
  description: 'shows information about the state of your Heroku Kafka cluster',
  help: `
    Shows the state of your Heroku Kafka cluster.

    Examples:

    $ heroku kafka:info
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaInfo))
};
