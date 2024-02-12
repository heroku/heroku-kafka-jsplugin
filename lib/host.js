'use strict'

module.exports = function () {
  return process.env.HEROKU_DATA_HOST || 'api.data.heroku.com'
}
