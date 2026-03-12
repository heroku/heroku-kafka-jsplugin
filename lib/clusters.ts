import cli from '@heroku/heroku-cli-util'
import host from './host.js'
import debug from './debug.js'
import fetcher from './fetcher.js'
import { Addon } from './shared.js'

const VERSION = 'v0'

interface HerokuClient {
  request(params: any): Promise<any>
  get(path: string, options?: any): Promise<any>
  post(path: string, options?: any): Promise<any>
}

interface Context {
  app: string
  [key: string]: any
}

interface WaitStatus {
  message: string
  'waiting?': boolean
  'healthy?': boolean
  'deprovisioned?'?: boolean
  'missing?'?: boolean
}

interface RequestParams {
  path?: string
  method?: string
  body?: any
  host?: string
  accept?: string
  [key: string]: any
}

interface TopicInfo {
  topics: Array<{
    name: string
    prefix?: string
    [key: string]: any
  }>
  [key: string]: any
}

interface HerokuError extends Error {
  statusCode: number
}

class HerokuKafkaClusters {
  heroku: HerokuClient
  env: any
  context: Context
  app: string

  constructor (heroku: HerokuClient, env: any, context: Context) {
    this.heroku = heroku
    this.env = env
    this.context = context
    this.app = context.app
  }

  async waitStatus (addon: Addon | null): Promise<WaitStatus | null> {
    let errorResponse: WaitStatus = {
      message: 'unknown',
      'waiting?': true,
      'healthy?': false
    }

    if (!addon) {
      return null
    }
    var response = await this.request({
      path: `/data/kafka/${VERSION}/clusters/${addon.id}/wait_status`
    }).then((res: any) => res.body || res)
      .catch(function (err: HerokuError): WaitStatus {
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

  request (params: RequestParams): Promise<any> {
    const h = host()
    debug(`picked shogun host: ${h}`)
    const {path, method, body, ...rest} = params
    const url = `https://${h}${path}`
    return this.heroku.request(url, {
      method: method || 'GET',
      body,
      headers: {
        'accept': params.accept || 'application/json'
      },
      ...rest
    })
  }
}

// Looks up cluster by name. Name is optional, but only one cluster
// must exit on the app if it is omitted.
async function withCluster (heroku: HerokuClient, app: string, cluster: string | undefined, fn: (addon: Addon) => Promise<any>): Promise<any> {
  const fetch = fetcher(heroku)
  let addon: Addon
  if (cluster) {
    addon = await fetch.addon(app, cluster)
  } else {
    const addons = await fetch.all(app)
    if (addons.length === 1) {
      addon = addons[0]
    } else if (addons.length === 0) {
      cli.exit(1, `found no kafka add-ons on ${app}`)
    } else {
      cli.exit(1, `found more than one kafka add-on on ${app}: ${addons.map(function (addon) { return addon.name }).join(', ')}`)
    }
  }
  return await fn(addon)
}

async function topicConfig (heroku: HerokuClient, addonId: string, topic: string): Promise<any> {
  const response = await request(heroku, {
    path: `/data/kafka/${VERSION}/clusters/${addonId}/topics`
  }) as any
  const info = (response?.body || response) as TopicInfo
  let forTopic = info.topics.find((t) => t.name === topic || ((t.prefix || '') + t.name) === topic)
  if (!forTopic) {
    cli.exit(1, `topic ${topic} not found`)
  }
  return forTopic
}

// Fetch kafka info about a provisioned cluster or exit with failure
function fetchProvisionedInfo (heroku: HerokuClient, addon: Addon): Promise<any> {
  const url = `https://${host()}/data/kafka/v0/clusters/${addon.id}`
  return heroku.request(url, {method: 'GET'})
    .then((res: any) => res.body || res)
    .catch((err: HerokuError) => {
    if (err.statusCode !== 404) throw err
    cli.exit(1, `${cli.color.addon(addon.name)} is not yet provisioned.\nRun ${cli.color.cmd('heroku kafka:wait')} to wait until the cluster is provisioned.`)
  })
}

function request (heroku: HerokuClient, params: RequestParams): Promise<any> {
  const h = host()
  debug(`picked shogun host: ${h}`)
  const {path, method, body, ...rest} = params
  const url = `https://${h}${path}`
  return heroku.request(url, {
    method: method || 'GET',
    body,
    headers: {
      'accept': params.accept || 'application/json'
    },
    ...rest
  })
}

export {
  HerokuKafkaClusters,
  withCluster,
  request,
  topicConfig,
  fetchProvisionedInfo
}
