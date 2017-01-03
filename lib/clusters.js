'use strict'

const cli = require('heroku-cli-util')
const host = require('./host')
const debug = require('./debug')

const VERSION = 'v0'

function HerokuKafkaClusters (heroku, env, context) {
  this.heroku = heroku
  this.env = env
  this.context = context
  this.app = context.app
}

HerokuKafkaClusters.prototype.waitStatus = function * (addon) {
  let errorResponse = {
    message: 'unknown',
    'waiting?': true,
    'healthy?': false
  }

  if (!addon) {
    return null
  }
  var response = yield this.request({
    path: `/client/kafka/${VERSION}/clusters/${addon.name}/wait_status`
  }).catch(function (err) {
    if (err.statusCode === 410) {
      return Object.assign({ 'deprovisioned?': true }, errorResponse)
    } else if (err.statusCode === 404) {
      return Object.assign({ 'missing?': true }, errorResponse)
    } else {
      return errorResponse
    }
  })
  return response
}

HerokuKafkaClusters.prototype.request = function (params) {
  const h = host()
  debug(`picked shogun host: ${h}`)
  var defaultParams = {
    host: h,
    accept: 'application/json'
  }
  return this.heroku.request(Object.assign(defaultParams, params))
}

// Looks up cluster by name. Name is optional, but only one cluster
// must exit on the app if it is omitted.
function * withCluster (heroku, app, cluster, fn) {
  const fetcher = require('./fetcher')(heroku)
  let addon
  if (cluster) {
    addon = yield fetcher.addon(app, cluster)
  } else {
    const addons = yield fetcher.all(app)
    if (addons.length === 1) {
      addon = addons[0]
    } else if (addons.length === 0) {
      cli.exit(1, `found no kafka add-ons on ${app}`)
    } else {
      cli.exit(1, `found more than one kafka add-on on ${app}: ${addons.map(function (addon) { return addon.name }).join(', ')}`)
    }
  }
  yield * fn(addon)
}

function request (heroku, params) {
  const h = host()
  debug(`picked shogun host: ${h}`)
  var defaultParams = {
    host: h,
    accept: 'application/json'
  }
  return heroku.request(Object.assign(defaultParams, params))
}

module.exports = {
  HerokuKafkaClusters: HerokuKafkaClusters,
  withCluster,
  request
}
