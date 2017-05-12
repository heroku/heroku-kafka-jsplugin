'use strict'

const parseDuration = require('../shared').parseDuration

module.exports = function DurationFlag (options = {}, env = process.env) {
  const defaultOptions = {
    description: 'length of time messages in the topic should be retained (at least 24h)',
    parse: (input) => {
      if (!input) return
      let retentionTimeMillis = parseDuration(input)
      if (!retentionTimeMillis) {
        throw new Error(`Could not parse retention time '${input}'; expected value like '10d' or '36h'`)
      }
      return retentionTimeMillis
    }
  }
  return Object.assign(defaultOptions, options)
}
