import memoize from 'lodash.memoize'
import {Addon} from './shared.js'

interface HerokuClient {
  get(path: string, options?: any): Promise<any>
  post(path: string, options?: any): Promise<any>
}

interface ResolveOptions {
  addon_service?: string
  namespace?: string
}

interface HerokuError extends Error {
  body?: {
    resource?: string
  }
  statusCode: number
}

class NotFoundError extends Error {
  statusCode: number

  constructor() {
    super('Couldn\'t find that addon.')
    this.name = 'NotFound'
    this.statusCode = 404
    Error.captureStackTrace(this, this.constructor)
  }
}

class AmbiguousError extends Error {
  body: {id: string; message: string}
  matches: any[]
  statusCode: number
  type: string

  constructor(matches: any[], type: string) {
    super(`Ambiguous identifier; multiple matching add-ons found: ${matches.map(match => match.name).join(', ')}.`)
    this.name = 'AmbiguousError'
    this.statusCode = 422
    this.body = {id: 'multiple_matches', message: this.message}
    this.matches = matches
    this.type = type
    Error.captureStackTrace(this, this.constructor)
  }
}

const addonHeaders = function (): Record<string, string> {
  return {
    Accept: 'application/vnd.heroku+json; version=3.actions',
    'Accept-Expansion': 'addon_service,plan',
  }
}

const attachmentHeaders = function (): Record<string, string> {
  return {
    Accept: 'application/vnd.heroku+json; version=3.actions',
    'Accept-Inclusion': 'addon:plan,config_vars',
  }
}

const appAddon = function (heroku: HerokuClient, app: string, id: string, options: ResolveOptions = {}): Promise<any> {
  const headers = addonHeaders()
  return heroku.post('/actions/addons/resolve', {
    headers: headers,
    body: {app: app, addon: id, addon_service: options.addon_service},
  })
  .then((res: any) => res.body || res)
  .then(singularize('addon', options.namespace))
}

const handleNotFound = function (err: HerokuError, resource: string): boolean {
  if (err.statusCode === 404 && err.body && err.body.resource === resource) {
    return true
  } else {
    throw err
  }
}

const addonResolver = function (heroku: HerokuClient, app: string | null, id: string, options: ResolveOptions = {}): Promise<any> {
  const headers = addonHeaders()

  let getAddon = function (id: string): Promise<any> {
    return heroku.post('/actions/addons/resolve', {
      headers: headers,
      body: {app: null, addon: id, addon_service: options.addon_service},
    })
    .then((res: any) => res.body || res)
    .then(singularize('addon', options.namespace))
  }

  if (!app || id.includes('::')) return getAddon(id)

  return appAddon(heroku, app, id, options)
  .catch(function (err: HerokuError) {
    if (handleNotFound(err, 'add_on')) return getAddon(id)
  })
}

/**
 * Replacing memoize with our own memoization function that works with promises
 * https://github.com/lodash/lodash/blob/da329eb776a15825c04ffea9fa75ae941ea524af/lodash.js#L10534
 */
const memoizePromise = function (func: Function, resolver: Function): any {
  const memoized: any = function (this: any) {
    const args = arguments
    const key = resolver.apply(this, args)
    const cache = memoized.cache

    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = func.apply(this, args)

    return result.then(function (this: any) {
      memoized.cache = cache.set(key, result) || cache
      return result
    })
  }

  memoized.cache = new memoize.Cache()
  return memoized
}

const addon = memoizePromise(addonResolver, (_: any, app: string, id: string, options: ResolveOptions = {}) => `${app}|${id}|${options.addon_service}`)

const singularize = function (type: string, namespace?: string): (matches: any[]) => any {
  return (matches: any[]) => {
    if (namespace) {
      matches = matches.filter(m => m.namespace === namespace)
    } else if (matches.length > 1) {
      // In cases that aren't specific enough, filter by namespace
      matches = matches.filter(m => !m.hasOwnProperty('namespace') || m.namespace === null)
    }

    switch (matches.length) {
    case 0:
      throw new NotFoundError()
    case 1:
      return matches[0]
    default:
      throw new AmbiguousError(matches, type)
    }
  }
}

const attachment = function (heroku: HerokuClient, app: string | null, id: string, options: ResolveOptions = {}): Promise<any> {
  const headers = attachmentHeaders()

  function getAttachment(id: string): Promise<any> {
    return heroku.post('/actions/addon-attachments/resolve', {
      headers: headers, body: {app: null, addon_attachment: id, addon_service: options.addon_service},
    })
    .then((res: any) => res.body || res)
    .then(singularize('addon_attachment', options.namespace))
    .catch(function (err: HerokuError) {
      handleNotFound(err, 'add_on attachment')
    })
  }

  function getAppAddonAttachment(addon: Addon, app: string): Promise<any> {
    return heroku.get(`/addons/${encodeURIComponent(addon.id)}/addon-attachments`, {headers})
    .then((res: any) => res.body || res)
    .then(filter(app, options.addon_service))
    .then(singularize('addon_attachment', options.namespace))
  }

  let promise: Promise<any>
  if (!app || id.includes('::')) {
    promise = getAttachment(id)
  } else {
    promise = appAttachment(heroku, app, id, options)
    .catch(function (err: HerokuError) {
      handleNotFound(err, 'add_on attachment')
    })
  }

  // first check to see if there is an attachment matching this app/id combo
  return promise
  .then(function (attachment: any) {
    return {attachment}
  })
  .catch(function (error: any) {
    return {error}
  })
  // if no attachment, look up an add-on that matches the id
  .then((attachOrError: {attachment?: any, error?: any}) => {
    let {attachment, error} = attachOrError

    if (attachment) return attachment

    // If we were passed an add-on slug, there still could be an attachment
    // to the context app. Try to find and use it so `context_app` is set
    // correctly in the SSO payload.
    else if (app) {
      return addon(heroku, app, id, options)
      .then((addon: Addon) => getAppAddonAttachment(addon, app))
      .catch((addonError: any) => {
        if (error) throw error
        throw addonError
      })
    } else {
      if (error) throw error
      throw new NotFoundError()
    }
  })
}

const appAttachment = function (heroku: HerokuClient, app: string, id: string, options: ResolveOptions = {}): Promise<any> {
  const headers = attachmentHeaders()
  return heroku.post('/actions/addon-attachments/resolve', {
    headers: headers, body: {app: app, addon_attachment: id, addon_service: options.addon_service},
  })
  .then((res: any) => res.body || res)
  .then(singularize('addon_attachment', options.namespace))
}

const filter = function (app: string, addonService?: string): (attachments: any[]) => any[] {
  return (attachments: any[]) => {
    return attachments.filter((attachment: any) => {
      if (attachment.app.name !== app) {
        return false
      }

      if (addonService && attachment.addon_service.name !== addonService) {
        return false
      }

      return true
    })
  }
}

export {
  addon, appAddon, appAttachment, attachment,
}
