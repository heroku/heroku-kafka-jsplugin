'use strict';

let VERSION = "v0";

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
    auth: `${this.context.auth.username}:${this.context.auth.password}`
  });
  return response;
};

HerokuKafkaResource.prototype.host = function () {
  if (this.env.SHOGUN) {
    return `shogun-${this.env.SHOGUN}.herokuapp.com`;
  } else {
    return "postgres-api.heroku.com";
  }
};

HerokuKafkaResource.prototype.addon = function* () {
  let availableAddons = yield this.heroku.apps(this.app).addons().listByApp();
  let kafkaAddon = availableAddons.filter(function (addon) { return addon.addon_service.name === 'heroku-kafka'; });
  return kafkaAddon[0];
};

module.exports = {
  HerokuKafkaResource: HerokuKafkaResource
};
