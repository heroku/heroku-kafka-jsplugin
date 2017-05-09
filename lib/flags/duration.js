'use strict';

const parseDuration = require('../shared').parseDuration

module.exports = function DurationFlag (options = {}, env = process.env) {
  const defaultOptions = {
    char: '',
    description: 'organization to use',
    parse: (input) => { return parseDuration(input) }
  }
  return Object.assign(defaultOptions, options)
}
