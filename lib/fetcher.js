'use strict'

const co = require('co')
const debug = require('./debug')

const DEFAULT_ADDON_NAME = 'heroku-kafka'

function addonName () {
  if (process.env.HEROKU_KAFKA_ADDON_NAME) {
    return process.env.HEROKU_KAFKA_ADDON_NAME
  } else {
    return DEFAULT_ADDON_NAME
  }
}

function isKafka (addon) {
  const slug = addon.plan.name.split(':')[0]
  return slug === addonName()
}

module.exports = heroku => {
  function * addon (app, cluster) {
    const {resolve} = require('heroku-cli-addons')

    cluster = cluster || 'KAFKA_URL'
    debug(`fetching ${cluster} on ${app}`)
    let attachment = yield resolve.attachment(heroku, app, cluster, {'Accept-Inclusion': 'addon:plan'})
    return attachment.addon
  }

  function * all (app) {
    const uniqby = require('lodash.uniqby')

    debug(`fetching all clusters on ${app}`)

    let attachments = yield heroku.get(`/apps/${app}/addon-attachments`, {
      headers: {'Accept-Inclusion': 'addon:plan'}
    })
    let addons = attachments.map(a => a.addon)

    addons = addons.filter(a => isKafka(a))
    addons = uniqby(addons, 'id')

    return addons
  }

  return {
    addon: co.wrap(addon),
    all: co.wrap(all)
  }
}
