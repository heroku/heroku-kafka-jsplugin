import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'
import {color, hux} from '@heroku/heroku-cli-util'
import humanize from 'humanize-plus'
import sortBy from 'lodash.sortby'
import utilizationBar from '../../lib/utilizationBar.js'
import fetcherFn from '../../lib/fetcher.js'
import {request} from '../../lib/clusters.js'
import {Addon, Attachment} from '../../lib/shared.js'

const VERSION = 'v0'

interface ClusterInfo {
  addon: Addon
  attachments: any[]
  cluster: any
  configVars?: string[]
}

interface InfoLine {
  name: string
  values: string[]
}

function configVarsFromName(attachments: any[], name: string): string[] {
  return attachments
    .filter((att: any) => att.addon.name === name)
    .map((att: any) => att.name + '_URL')
    .sort((a: string, b: string) => {
      if (a === 'KAFKA_URL') return -1
      if (b === 'KAFKA_URL') return 1
      return a.localeCompare(b)
    })
}

function formatInfo(info: ClusterInfo): InfoLine[] {
  const cluster = info.cluster
  const addon = info.addon

  const lines = [
    {name: 'Plan', values: [addon.plan.name]},
    {name: 'Status', values: [cluster.state.message]},
    {name: 'Version', values: [cluster.version]},
    {name: 'Created', values: [cluster.created_at]},
  ]

  if (cluster.robot.is_robot) {
    lines.push({name: 'Robot', values: ['True']})
    lines.push({name: 'Robot TTL', values: [cluster.robot.robot_ttl]})
  }

  const limits = cluster.limits
  // we hide __consumer_offsets in topic listing; don't count it
  const topicCount = cluster.topics.filter((topic: string) => topic !== '__consumer_offsets').length
  if (limits.max_topics) {
    lines.push({
      name: 'Topics',
      values: [`${utilizationBar(topicCount, limits.max_topics)} ${topicCount} / ${limits.max_topics} topics, see heroku kafka:topics`],
    })
  } else {
    lines.push({
      name: 'Topics',
      values: [`${topicCount} ${humanize.pluralize(topicCount, 'topic')}, see heroku kafka:topics`],
    })
  }

  if (cluster.topic_prefix) {
    lines.push({name: 'Prefix', values: [cluster.topic_prefix]})
  }

  if (limits.max_partition_replica_count) {
    lines.push({
      name: 'Partitions',
      values: [`${utilizationBar(cluster.partition_replica_count, limits.max_partition_replica_count)} ${cluster.partition_replica_count} / ${limits.max_partition_replica_count} partition ${humanize.pluralize(cluster.partition_replica_count, 'replica')} (partitions × replication factor)`],
    })
  }

  lines.push({
    name: 'Messages',
    values: [`${humanize.intComma(cluster.messages_in_per_sec)} ${humanize.pluralize(cluster.messages_in_per_sec, 'message')}/s`],
  })

  lines.push({
    name: 'Traffic',
    values: [`${humanize.fileSize(cluster.bytes_in_per_sec)}/s in / ${humanize.fileSize(cluster.bytes_out_per_sec)}/s out`],
  })

  if (cluster.data_size !== undefined && limits.data_size.limit_bytes !== undefined) {
    const size = cluster.data_size
    const limit = limits.data_size.limit_bytes
    const percentage = ((size / limit) * 100.0).toFixed(2)
    lines.push({
      name: 'Data Size',
      values: [`${utilizationBar(size, limit)} ${humanize.fileSize(size)} / ${humanize.fileSize(limit)} (${percentage}%)`],
    })
  }

  if (cluster.customer_encryption_key) {
    lines.push({
      name: 'Customer Encryption Key',
      values: [cluster.customer_encryption_key],
    })
  }

  lines.push({name: 'Add-on', values: [color.addon(addon.name)]})

  return lines
}

function displayCluster(cluster: ClusterInfo): void {
  hux.styledHeader(cluster.configVars!.map(c => color.label(c)).join(', '))

  const clusterInfo = formatInfo(cluster)
  const info = clusterInfo.reduce((info: Record<string, string>, i: InfoLine) => {
    if (i.values.length > 0) {
      info[i.name] = i.values.join(', ')
    }
    return info
  }, {})
  const keys = clusterInfo.map(i => i.name)

  hux.styledObject(info, keys)
  console.log()
}

export default class Info extends Command {
  static aliases = ['kafka']

  static args = {
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }

  static description = 'display cluster information'

  static examples = [
    '$ heroku kafka',
    '$ heroku kafka:info',
    '$ heroku kafka:info HEROKU_KAFKA_BROWN_URL',
  ]

  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
  }

  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(Info)

    const fetcher = fetcherFn(this.heroku)
    const app = flags.app
    const cluster = args.cluster

    let addons: Addon[] = []
    const {body: attachments} = await this.heroku.get(`/apps/${app}/addon-attachments`) as {body: any[]}

    if (cluster) {
      addons = await Promise.all([fetcher.addon(app, cluster)])
    } else {
      addons = await fetcher.all(app)
      if (addons.length === 0) {
        ux.stdout(`${color.app(app)} has no heroku-kafka clusters.\n`)
        return
      }
    }

    let clusters: ClusterInfo[] = await Promise.all(addons.map(async (addon: Addon) => {
      const clusterData = await request(this.heroku, {
        method: 'GET',
        path: `/data/kafka/${VERSION}/clusters/${addon.id}`,
      }).then((res: any) => res.body || res).catch((err: any) => {
        if (err.statusCode !== 404) throw err
        const warnMsg = `${color.addon(addon.name)} is not yet provisioned.\nRun ${color.code('heroku kafka:wait')} to wait until the cluster is provisioned.`
        ux.warn(warnMsg)
        return null
      })
      return {
        addon,
        attachments,
        cluster: clusterData,
      }
    }))

    clusters = clusters.filter((cluster: ClusterInfo) => cluster.cluster)
    clusters.forEach((cluster: ClusterInfo) => {
      cluster.configVars = configVarsFromName(cluster.attachments, cluster.addon.name)
    })
    clusters = sortBy(clusters, (cluster: ClusterInfo) => cluster.configVars![0] !== 'KAFKA_URL', 'configVars[0]')

    clusters.forEach(displayCluster)
  }
}

export {displayCluster}
