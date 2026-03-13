import {color} from '@heroku/heroku-cli-util'
import {ux} from '@oclif/core'

import debug from './debug.js'
import fetcher from './fetcher.js'
import host from './host.js'
import {Addon} from './shared.js'

const VERSION = 'v0'

interface HerokuClient {
  get(path: string, options?: any): Promise<any>
  post(path: string, options?: any): Promise<any>
  request(url: string, options?: any): Promise<any>
}

interface Context {
  [key: string]: any
  app: string
}

interface WaitStatus {
  'deprovisioned?'?: boolean
  'error?'?: boolean
  'healthy?': boolean
  message: string
  'missing?'?: boolean
  'waiting?': boolean
}

interface RequestParams {
  [key: string]: any
  accept?: string
  body?: any
  host?: string
  method?: string
  path?: string
}

interface TopicInfo {
  [key: string]: any
  topics: Array<{
    [key: string]: any
    name: string
    prefix?: string
  }>
}

interface HerokuError extends Error {
  statusCode: number
}

class HerokuKafkaClusters {
  app: string
  context: Context
  env: any
  heroku: HerokuClient

  constructor(heroku: HerokuClient, env: any, context: Context) {
    this.heroku = heroku
    this.env = env
    this.context = context
    this.app = context.app
  }

  request(params: RequestParams): Promise<any> {
    const h = host()
    debug(`picked shogun host: ${h}`)
    const {path, method, body, ...rest} = params
    const url = `https://${h}${path}`
    return this.heroku.request(url, {
      method: method || 'GET',
      body,
      headers: {
        accept: params.accept || 'application/json',
      },
      ...rest,
    })
  }

  async waitStatus(addon: Addon | null): Promise<WaitStatus | null> {
    const errorResponse: WaitStatus = {
      message: 'unknown',
      'waiting?': true,
      'healthy?': false,
    }

    if (!addon) {
      return null
    }

    const response = await this.request({
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/wait_status`,
    }).then((res: any) => res.body || res)
    .catch(function (err: HerokuError): WaitStatus {
      if (err.statusCode === 410) {
        return Object.assign({'deprovisioned?': true}, errorResponse)
      }

      if (err.statusCode === 404) {
        return Object.assign({'missing?': true}, errorResponse)
      }

      return errorResponse
    })
    return response
  }
}

// Looks up cluster by name. Name is optional, but only one cluster
// must exit on the app if it is omitted.
async function withCluster(heroku: HerokuClient, app: string, cluster: string | undefined, fn: (addon: Addon) => Promise<any>): Promise<any> {
  const fetch = fetcher(heroku)
  let addon: Addon
  if (cluster) {
    addon = await fetch.addon(app, cluster)
  } else {
    const addons = await fetch.all(app)
    if (addons.length === 1) {
      addon = addons[0]
    } else if (addons.length === 0) {
      ux.error(`found no kafka add-ons on ${app}`)
    } else {
      ux.error(`found more than one kafka add-on on ${app}: ${addons.map(function (addon) {
        return addon.name
      }).join(', ')}`)
    }
  }

  return await fn(addon)
}

async function topicConfig(heroku: HerokuClient, addonId: string, topic: string): Promise<any> {
  const response = await request(heroku, {
    path: `/data/kafka/${VERSION}/clusters/${addonId}/topics`,
  }) as any
  const info = (response?.body || response) as TopicInfo
  const forTopic = info.topics.find(t => t.name === topic || ((t.prefix || '') + t.name) === topic)
  if (!forTopic) {
    ux.error(`topic ${topic} not found`)
  }

  return forTopic
}

// Fetch kafka info about a provisioned cluster or exit with failure
function fetchProvisionedInfo(heroku: HerokuClient, addon: Addon): Promise<any> {
  const url = `https://${host()}/data/kafka/v0/clusters/${addon.id}`
  return heroku.request(url, {method: 'GET'})
  .then((res: any) => res.body || res)
  .catch((err: HerokuError) => {
    if (err.statusCode !== 404) throw err
    ux.error(`${color.addon(addon.name)} is not yet provisioned.\nRun ${color.command('heroku kafka:wait')} to wait until the cluster is provisioned.`)
  })
}

function request(heroku: HerokuClient, params: RequestParams): Promise<any> {
  const h = host()
  debug(`picked shogun host: ${h}`)
  const {path, method, body, ...rest} = params
  const url = `https://${h}${path}`
  return heroku.request(url, {
    method: method || 'GET',
    body,
    headers: {
      accept: params.accept || 'application/json',
    },
    ...rest,
  })
}

export {
  fetchProvisionedInfo,
  HerokuKafkaClusters,
  request,
  topicConfig,
  withCluster,
}
