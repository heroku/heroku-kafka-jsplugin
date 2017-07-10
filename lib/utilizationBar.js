'use strict'

const chalk = require('chalk')

module.exports = function (current, total, width = 10) {
  let percentage = current / total
  if (percentage > 1) percentage = 1
  if (percentage < 0) percentage = 0
  const filled = Math.round(percentage * width)
  const empty = width - filled
  let output = chalk.blue('█'.repeat(filled))
  output += '·'.repeat(empty)
  return `[${output}]`
}
