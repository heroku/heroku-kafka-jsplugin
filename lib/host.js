'use strict'

module.exports = function () {
  return process.env.HEROKU_KAFKA_HOST || 'api.data.heroku.com'
}
