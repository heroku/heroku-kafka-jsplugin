'use strict'

const parseDuration = require('../shared').parseDuration

module.exports = function DurationFlag (options = {}, env = process.env) {
  const defaultOptions = {
    parse: (input) => {
      if (!input) return
      let retentionTimeMillis = parseDuration(input)
      if (!retentionTimeMillis) {
        throw new Error(`Could not parse duration '${input}'; expected value like '10d' or '36h'`)
      }
      return retentionTimeMillis
    }
  }
  return Object.assign(defaultOptions, options)
}
