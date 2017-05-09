'use strict';

const parseDuration = require('../shared').parseDuration

module.exports = function DurationFlag (options = {}, env = process.env) {
  const defaultOptions = {
    description: 'length of time messages in the topic should be retained (at least 24h)',
    parse: (input) => { return parseDuration(input) }
  }
  return Object.assign(defaultOptions, options)
}
