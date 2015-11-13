'use strict';

let VERSION = "v0";
let DEFAULT_HOST = "postgres-api.heroku.com";
let _ = require('underscore');

function HerokuKafkaClusters(heroku, env, context) {
  this.heroku = heroku;
  this.env = env;
  this.context = context;
  this.app = context.app;
}

HerokuKafkaClusters.prototype.info = function* (cluster) {
  var that = this;
  var addons = yield this.addonsForManyClusterCommand(cluster);
  var responses = yield _.map(addons, function(addon) {
    return that.request({
      path: `/client/kafka/${VERSION}/clusters/${addon.name}`
    });
  });
  return responses;
};

HerokuKafkaClusters.prototype.fail = function* (cluster, catastrophic, zk) {
  var addon = yield this.addonForSingleClusterCommand(cluster);
  if (addon) {
    var response = yield this.request({
      method: 'POST',
      body: { catastrophic: catastrophic, zookeeper: zk },
      path: `/client/kafka/${VERSION}/clusters/${addon.kafka.name}/induce-failure`
    });
    return response;
  } else {
    console.log(`kafka addon not found, but found these addons: ${addon.available.map(function (addon) { return addon.addon_service.name; }).join(',')}`);
    return null;
  }
};

HerokuKafkaClusters.prototype.waitStatus = function* (cluster) {
  var addon = yield this.addonForSingleClusterCommand(cluster);
  if (addon) {
    var response = yield this.request({
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/wait_status`
    });
    return response;
  } else {
    return null;
  }
};

HerokuKafkaClusters.prototype.request = function (params) {
  var defaultParams = {
    host: this.host(),
    auth: `${this.context.auth.username}:${this.context.auth.password}`
  };
  return this.heroku.request(_.extend(defaultParams, params));
};

HerokuKafkaClusters.prototype.host = function () {
  if (this.env.SHOGUN) {
    return `shogun-${this.env.SHOGUN}.herokuapp.com`;
  } else if (this.env.DEPLOY) {
    return `shogun-${this.env.DEPLOY}.herokuapp.com`;
  } else {
    return DEFAULT_HOST;
  }
};

HerokuKafkaClusters.prototype.addonsForManyClusterCommand = function* (cluster) {
  var addons = yield this.addons();
  var filteredAddons;
  if (cluster === undefined) {
    filteredAddons = addons.kafkas;
  } else {
    filteredAddons = addons.kafkas.filter(function (addon) { return _.contains(addon.config_vars, cluster) || addon.name == cluster; })[0];
  }
  if (filteredAddons.length !== 0) {
    return filteredAddons;
  } else if (cluster !== undefined) {
    console.log(`couldn't find the kafka cluster ${cluster}, but found these addons instead: ${addons.available.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  } else {
    console.log(`kafka addon not found, but found these addons: ${addons.available.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  }
};

HerokuKafkaClusters.prototype.addonForSingleClusterCommand = function* (cluster) {
  var addons = yield this.addons();
  var addon;
  if (addons.kafkas.length === 1 && cluster === undefined) {
    addon = addons.kafkas[0];
  } else {
    addon = addons.kafkas.filter(function (addon) { return _.contains(addon.config_vars, cluster) || addon.name == cluster; })[0];
  }
  if (addon) {
    return addon;
  } else if (cluster !== undefined) {
    console.log(`couldn't find the kafka cluster ${cluster}, but found these addons instead: ${addons.available.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  } else if (addons.kafkas.length !== 1) {
    console.log(`please specify a kafka cluster. Possible clusters: ${addons.kafkas.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  } else {
    console.log(`kafka addon not found, but found these addons: ${addons.available.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  }
};

HerokuKafkaClusters.prototype.addons = function* () {
  let availableAddons = yield this.heroku.apps(this.app).addons().listByApp();
  let kafkaAddons = availableAddons.filter(function (addon) { return addon.addon_service.name.startsWith('heroku-kafka'); });
  return {
    kafkas: kafkaAddons,
    available: availableAddons
  };
};

module.exports = {
  HerokuKafkaClusters: HerokuKafkaClusters
};
