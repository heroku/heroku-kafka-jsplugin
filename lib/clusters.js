'use strict'

const cli = require('@heroku/heroku-cli-util')
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
    path: `/data/kafka/${VERSION}/clusters/${addon.id}/wait_status`
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
  return yield * fn(addon)
}

function * topicConfig (heroku, addonId, topic) {
  let info = yield request(heroku, {
    path: `/data/kafka/${VERSION}/clusters/${addonId}/topics`
  })
  let forTopic = info.topics.find((t) => t.name === topic || ((t.prefix || '') + t.name) === topic)
  if (!forTopic) {
    cli.exit(1, `topic ${topic} not found`)
  }
  return forTopic
}

// Fetch kafka info about a provisioned cluster or exit with failure
function fetchProvisionedInfo (heroku, addon) {
  return heroku.request({
    host: host(addon),
    method: 'get',
    path: `/data/kafka/v0/clusters/${addon.id}`
  }).catch(err => {
    if (err.statusCode !== 404) throw err
    cli.exit(1, `${cli.color.addon(addon.name)} is not yet provisioned.\nRun ${cli.color.cmd('heroku kafka:wait')} to wait until the cluster is provisioned.`)
  })
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
  request,
  topicConfig,
  fetchProvisionedInfo
}
