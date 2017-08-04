'use strict'

const cli = require('heroku-cli-util')

function deprecated (cmd, newCmd, newTopic) {
  return function * (context, heroku) {
    const newName = `${newTopic || context.command.topic}:${newCmd}`
    cli.warn(`\nWARNING: ${context.command.topic}:${context.command.command} is deprecated; please use ${newName}\n`)
    return yield * cmd(context, heroku)
  }
}

function clusterConfig (attachment, config) {
  if (!attachment) {
    throw new Error('Could not find add-on')
  }

  const findVar = (suffix, required = true) => {
    const configKey = attachment.config_vars.find(v => v.endsWith('_' + suffix))
    if (!configKey) {
      if (required) {
        throw new Error(`Could not find ${suffix} for ${attachment.name} on ${attachment.app.name}`)
      } else {
        return undefined
      }
    }
    const configVal = config[configKey]
    if (!configVal && required) {
      throw new Error(`Config value ${suffix} for ${attachment.name} on ${attachment.app.name} is empty`)
    }
    return configVal
  }

  return {
    url: findVar('URL'),
    trustedCert: findVar('TRUSTED_CERT'),
    clientCert: findVar('CLIENT_CERT'),
    clientCertKey: findVar('CLIENT_CERT_KEY'),
    prefix: findVar('PREFIX', false)
  }
}

function isPrivate (addon) {
  return addon.plan.name.indexOf('private-') !== -1
}

function parseBool (boolStr) {
  switch (boolStr) {
    case 'yes':
    case 'true':
    case 'on':
    case 'enable':
      return true
    case 'no':
    case 'false':
    case 'off':
    case 'disable':
      return false
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

function formatIntervalFromMilliseconds (milliseconds) {
  let remaining = milliseconds
  let multipliers = {
    day: (24 * 60 * 60 * 1000),
    hour: (60 * 60 * 1000),
    minute: (60 * 1000),
    second: 1000
  }
  let intervals = Object.keys(multipliers).sort((interval) => -multipliers[interval])
  let values = intervals.reduce((accum, interval) => { accum[interval] = 0; return accum }, {})
  let smallest = multipliers[intervals[intervals.length - 1]]

  while (remaining >= smallest) {
    let nextInterval = intervals.find((interval) => {
      return multipliers[interval] <= remaining
    })
    let nextIntervalValue = multipliers[nextInterval]
    let multiplier = 1

    while ((nextIntervalValue * (multiplier + 1)) <= remaining) {
      multiplier += 1
    }

    values[nextInterval] = multiplier
    remaining -= nextIntervalValue * multiplier
  }

  values.millisecond = remaining
  intervals.push('millisecond')

  return intervals.filter((interval) => values[interval] > 0).map((interval) => {
    let val = values[interval]
    return `${val} ${interval}${val > 1 ? 's' : ''}`
  }).join(' ')
}

module.exports = {
  clusterConfig,
  deprecated,
  parseBool,
  parseDuration,
  isPrivate,
  formatIntervalFromMilliseconds
}
