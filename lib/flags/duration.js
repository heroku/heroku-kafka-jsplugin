'use strict'

const parseDuration = require('../shared').parseDuration

module.exports = function DurationFlag (options = {}) {
  const required = options.optional === false || options.required
  const defaultOptions = {
    parse: (input, cmd, name) => {
      if (!input && required) throw new Error(`Missing required flag --${name}`)
      if (!input && !required) return
      let retentionTimeMillis = parseDuration(input)
      if (!retentionTimeMillis) {
        throw new Error(`Could not parse duration '${input}'; expected value like '10d' or '36h'`)
      }
      return retentionTimeMillis
    }
  }
  return Object.assign(defaultOptions, options)
}
