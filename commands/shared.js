'use strict';

const _ = require('underscore');

function clusterConfig(addon, config) {
  if (!addon) {
    return null;
  }
  let urlVar = _.find(addon.config_vars, function(key) {
    return key.match(/KAFKA_URL|HEROKU_KAFKA_[A-Z]+_URL/);
  });
  let trustedCertVar = _.find(addon.config_vars, function(key) {
    return key.match(/KAFKA_TRUSTED_CERT|HEROKU_KAFKA_[A-Z]+_TRUSTED_CERT/);
  });
  let clientCertVar = _.find(addon.config_vars, function(key) {
    return key.match(/KAFKA_CLIENT_CERT|HEROKU_KAFKA_[A-Z]+_CLIENT_CERT/);
  });
  let clientCertKeyVar = _.find(addon.config_vars, function(key) {
    return key.match(/KAFKA_CLIENT_CERT_KEY|HEROKU_KAFKA_[A-Z]+_CLIENT_CERT_KEY/);
  });
  return {
    url: config[urlVar],
    trustedCert: config[trustedCertVar],
    clientCert: config[clientCertVar],
    clientCertKey: config[clientCertKeyVar]
  };
}

module.exports = {
  clusterConfig: clusterConfig
};
