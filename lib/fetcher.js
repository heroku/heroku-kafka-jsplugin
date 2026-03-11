import debug from './debug.js'
import { attachment as attachmentResolver } from './resolve.js'

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

export default heroku => {
  async function addon (app, cluster) {
    cluster = cluster || 'KAFKA_URL'
    debug(`fetching ${cluster} on ${app}`)
    let attachment = await attachmentResolver(heroku, app, cluster, {'Accept-Inclusion': 'addon:plan'})
    return attachment.addon
  }

  async function all (app) {
    debug(`fetching all clusters on ${app}`)

    let attachments = await heroku.get(`/apps/${app}/addon-attachments`, {
      headers: {'Accept-Inclusion': 'addon:plan'}
    })
    let addons = attachments.map(a => a.addon)

    addons = addons.filter(a => isKafka(a))
    addons = uniqueByProperty(addons, 'id')

    return addons
  }

  return {
    addon,
    all
  }
}

function uniqueByProperty (array, property) {
  const seen = new Map()
  return array.filter(item => {
    const value = item[property]
    if (!seen.has(value)) {
      seen.set(value, true)
      return true
    }
    return false
  })
}
