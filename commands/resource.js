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
  if (addon.kafka) {
    var response = yield this.heroku.request({
      host: this.host(),
      path: `/client/kafka/${VERSION}/clusters/${addon.kafka.name}`,
      auth: `${this.context.auth.username}:${this.context.auth.password}`
    });
    return response;
  } else {
    console.log(`kafka addon not found, but found these addons: ${addon.available.map(function (addon) { return addon.addon_service.name; }).join(',')}`);
    return null;
  }
};

HerokuKafkaResource.prototype.fail = function* (catastrophic, zk) {
  var addon = yield this.addon();
  if (addon.kafka) {
    var response = yield this.heroku.request({
      host: this.host(),
      method: 'POST',
      body: { catastrophic: catastrophic, zookeeper: zk },
      path: `/client/kafka/${VERSION}/clusters/${addon.kafka.name}/induce-failure`,
      auth: `${this.context.auth.username}:${this.context.auth.password}`
    });
    return response;
  } else {
    console.log(`kafka addon not found, but found these addons: ${addon.available.map(function (addon) { return addon.addon_service.name; }).join(',')}`);
    return null;
  }
};

HerokuKafkaResource.prototype.waitStatus = function* () {
  var addon = yield this.addon();
  if (addon.kafka) {
    var response = yield this.heroku.request({
      host: this.host(),
      path: `/client/kafka/${VERSION}/clusters/${addon.kafka.name}/wait_status`,
      auth: `${this.context.auth.username}:${this.context.auth.password}`
    });
    return response;
  } else {
    console.log(`kafka addon not found, but found these addons: ${addon.available.map(function (addon) { return addon.addon_service.name; }).join(',')}`);
    return null;
  }
};

HerokuKafkaResource.prototype.host = function () {
  if (this.env.SHOGUN) {
    return `shogun-${this.env.SHOGUN}.herokuapp.com`;
  } else if (this.env.DEPLOY) {
    return `shogun-${this.env.DEPLOY}.herokuapp.com`;
  } else {
    return "postgres-api.heroku.com";
  }
};

HerokuKafkaResource.prototype.addon = function* () {
  let availableAddons = yield this.heroku.apps(this.app).addons().listByApp();
  let kafkaAddon = availableAddons.filter(function (addon) { return addon.addon_service.name.startsWith('heroku-kafka'); });
  return {
    kafka: kafkaAddon[0],
    available: availableAddons
  };
};

module.exports = {
  HerokuKafkaResource: HerokuKafkaResource
};
