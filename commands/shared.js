'use strict'

function clusterConfig (addon, config) {
  if (!addon) {
    return null
  }
  let urlVar = addon.config_vars.find(function (key) {
    return key.match(/KAFKA_URL|HEROKU_KAFKA_[A-Z]+_URL/)
  })
  let trustedCertVar = addon.config_vars.find(function (key) {
    return key.match(/KAFKA_TRUSTED_CERT|HEROKU_KAFKA_[A-Z]+_TRUSTED_CERT/)
  })
  let clientCertVar = addon.config_vars.find(function (key) {
    return key.match(/KAFKA_CLIENT_CERT|HEROKU_KAFKA_[A-Z]+_CLIENT_CERT/)
  })
  let clientCertKeyVar = addon.config_vars.find(function (key) {
    return key.match(/KAFKA_CLIENT_CERT_KEY|HEROKU_KAFKA_[A-Z]+_CLIENT_CERT_KEY/)
  })
  return {
    url: config[urlVar],
    trustedCert: config[trustedCertVar],
    clientCert: config[clientCertVar],
    clientCertKey: config[clientCertKeyVar]
  }
}

function parseDuration (durationStr) {
  if (/^\d+$/.test(durationStr)) {
    return parseInt(durationStr, 10)
  } else {
    let result = durationStr.match(/^(\d+) ?(ms|[smhd]|milliseconds?|seconds?|minutes?|hours?|days?)$/)
    if (result) {
      let magnitude = parseInt(result[1])
      let unit = result[2]
      let multiplier = 1
      switch (unit) {
        case 'ms':
        case 'millisecond':
        case 'milliseconds':
          multiplier = 1
          break
        case 's':
        case 'second':
        case 'seconds':
          multiplier = 1000
          break
        case 'm':
        case 'minute':
        case 'minutes':
          multiplier = 1000 * 60
          break
        case 'h':
        case 'hour':
        case 'hours':
          multiplier = 1000 * 60 * 60
          break
        case 'd':
        case 'day':
        case 'days':
          multiplier = 1000 * 60 * 60 * 24
          break
        default:
          return null
      }
      return magnitude * multiplier
    } else {
      return null
    }
  }
}

module.exports = {
  clusterConfig: clusterConfig,
  parseDuration: parseDuration
}
