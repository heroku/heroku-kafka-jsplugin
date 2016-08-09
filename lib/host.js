'use strict'

let DEFAULT_HOST = 'kafka-api.heroku.com'

module.exports = function () {
  if (process.env.HEROKU_KAFKA_HOST) {
    return process.env.HEROKU_KAFKA_HOST
  } else if (process.env.SHOGUN) {
    return `shogun-${process.env.SHOGUN}.herokuapp.com`
  } else if (process.env.DEPLOY) {
    return `shogun-${process.env.DEPLOY}.herokuapp.com`
  } else {
    return DEFAULT_HOST
  }
}
