import debug from './debug.js'
import { attachment as attachmentResolver } from './resolve.js'
import { Addon } from './shared.js'

const DEFAULT_ADDON_NAME = 'heroku-kafka'

interface HerokuClient {
  get(path: string, options?: any): Promise<any>
  post(path: string, options?: any): Promise<any>
}

interface AttachmentWithAddon {
  addon: Addon
}

function addonName (): string {
  if (process.env.HEROKU_KAFKA_ADDON_NAME) {
    return process.env.HEROKU_KAFKA_ADDON_NAME
  } else {
    return DEFAULT_ADDON_NAME
  }
}

function isKafka (addon: Addon): boolean {
  const slug = addon.plan.name.split(':')[0]
  return slug === addonName()
}

export default (heroku: HerokuClient) => {
  async function addon (app: string, cluster?: string): Promise<Addon> {
    cluster = cluster || 'KAFKA_URL'
    debug(`fetching ${cluster} on ${app}`)
    let attachment = await attachmentResolver(heroku, app, cluster, {}) as AttachmentWithAddon
    return attachment.addon
  }

  async function all (app: string): Promise<Addon[]> {
    debug(`fetching all clusters on ${app}`)

    let attachments = await heroku.get(`/apps/${app}/addon-attachments`, {
      headers: {'Accept-Inclusion': 'addon:plan'}
    }) as AttachmentWithAddon[]
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

function uniqueByProperty<T> (array: T[], property: keyof T): T[] {
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
