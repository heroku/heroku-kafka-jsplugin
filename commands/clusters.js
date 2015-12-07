'use strict';

let _ = require('underscore');
let cli = require('heroku-cli-util');

let VERSION = "v0";
let DEFAULT_HOST = "postgres-api.heroku.com";

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

HerokuKafkaClusters.prototype.topic = function* (cluster, topic) {
  var addon = yield this.addonForSingleClusterCommand(cluster);
  if (addon) {
    return yield this.request({
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/topics/${topic}`
    });
  } else {
    return null;
  }
};

HerokuKafkaClusters.prototype.topics = function* (cluster) {
  var addon = yield this.addonForSingleClusterCommand(cluster);
  if (addon) {
    return yield this.request({
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/topics`
    });
  } else {
    return null;
  }
};

HerokuKafkaClusters.prototype.fail = function* (cluster, catastrophic, zk) {
  var addon = yield this.addonForSingleClusterCommand(cluster);
  if (addon) {
    var response = yield this.request({
      method: 'POST',
      body: { catastrophic: catastrophic, zookeeper: zk },
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/induce-failure`
    });
    return response;
  } else {
    cli.error(`kafka addon not found, but found these addons: ${addon.available.map(function (addon) { return addon.addon_service.name; }).join(',')}`);
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

HerokuKafkaClusters.prototype.createTopic = function* (cluster, topicName, flags) {
  var addon = yield this.addonForSingleClusterCommand(cluster);
  if (addon) {
    var response = yield this.request({
      method: 'POST',
      body: {
        topic:
          {
            name: topicName,
            retention_time_ms: flags['retention-time'],
            replication_factor: flags['replication-factor'],
            partition_count: flags['partitions'],
            compaction: flags['compaction'] || false
          }
      },
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/topics`
    }).catch(function (err) { return err; });
    return this.handleResponse(response);
  } else {
    return null;
  }
};

HerokuKafkaClusters.prototype.configureTopic = function* (cluster, topicName, flags) {
  var addon = yield this.addonForSingleClusterCommand(cluster);
  if (addon) {
    var response = yield this.request({
      method: 'PUT',
      body: {
        topic:
          {
            name: topicName,
            retention_time_ms: flags['retention-time'],
            compaction: flags['compaction'] || false
          }
      },
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/topics/${topicName}`
    }).catch(function (err) { return err; });
    return this.handleResponse(response);
  } else {
    return null;
  }
};


HerokuKafkaClusters.prototype.deleteTopic = function* (cluster, topicName) {
  var addon = yield this.addonForSingleClusterCommand(cluster);
  if (addon) {
    var response = yield this.request({
      method: 'DELETE',
      body: {
        topic: { name: topicName }
      },
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/topics/${topicName}`
    }).catch(function (err) { return err; });
    return this.handleResponse(response);
  } else {
    return null;
  }
};

HerokuKafkaClusters.prototype.request = function (params) {
  cli.hush(`picked shogun host: ${this.host()}`);
  var defaultParams = {
    host: this.host(),
    auth: `${this.context.auth.username}:${this.context.auth.password}`,
    accept: 'application/json'
  };
  return this.heroku.request(_.extend(defaultParams, params));
};

HerokuKafkaClusters.prototype.handleResponse = function (response) {
  if (response.statusCode == 422) {
    return response.body.message;
  } else if (response.statusCode == undefined || (response.statusCode < 300 && response.statusCode >= 200)) {
    return null;
  } else {
    cli.hush("Error connecting to backend API");
    return "Error, please try again later.";
  }
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
    filteredAddons = this.findByClusterName(addons, cluster);
  }
  if (filteredAddons.length !== 0) {
    return filteredAddons;
  } else if (cluster !== undefined) {
    cli.error(`couldn't find the kafka cluster ${cluster}, but found these addons instead: ${addons.allAddons.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  } else {
    cli.error(`kafka addon not found, but found these addons: ${addons.allAddons.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  }
};

HerokuKafkaClusters.prototype.addonForSingleClusterCommand = function* (cluster) {
  var addons = yield this.addons();
  var addon;
  if (addons.kafkas.length === 1 && cluster === undefined) {
    addon = addons.kafkas[0];
  } else {
    addon = this.findByClusterName(addons, cluster)[0];
  }
  if (addon) {
    return addon;
  } else if (cluster !== undefined) {
    cli.error(`couldn't find the kafka cluster ${cluster}, but found these addons instead: ${addons.allAddons.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  } else if (addons.kafkas.length !== 1) {
    cli.error(`please specify a kafka cluster. Possible clusters: ${addons.kafkas.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  } else {
    cli.error(`kafka addon not found, but found these addons: ${addons.allAddons.map(function (addon) { return addon.name; }).join(',')}`);
    return null;
  }
};

HerokuKafkaClusters.prototype.findByClusterName = function (addons, cluster) {
  return addons.kafkas.filter(function (addon) { return _.contains(addon.config_vars, cluster) || addon.name == cluster; });
};

HerokuKafkaClusters.prototype.addons = function* () {
  let allAddons = yield this.heroku.apps(this.app).addons().listByApp();
  let kafkaAddons = allAddons.filter(function (addon) { return addon.addon_service.name.startsWith('heroku-kafka'); });
  return {
    kafkas: kafkaAddons,
    allAddons: allAddons
  };
};

module.exports = {
  HerokuKafkaClusters: HerokuKafkaClusters
};
