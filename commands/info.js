'use strict'

const co = require('co')
const cli = require('heroku-cli-util')
const humanize = require('humanize-plus')
const pixelBar = require('pixelbar').default

function configVarsFromName (attachments, name) {
  return attachments
    .filter((att) => att.addon.name === name)
    .map((att) => att.name + '_URL')
    .sort((name) => name !== 'KAFKA_URL')
}

function formatInfo (info) {
  const cluster = info.cluster
  const addon = info.addon

  let lines = [
    { name: 'Plan', values: [addon.plan.name] },
    { name: 'Status', values: [cluster.state.message] },
    { name: 'Version', values: [cluster.version] },
    { name: 'Created', values: [cluster.created_at] }
  ]

  if (cluster.robot.is_robot) {
    lines.push({ name: 'Robot', values: ['True'] })
    lines.push({ name: 'Robot TTL', values: [cluster.robot.robot_ttl] })
  }

  let limits = cluster.limits
  // we hide __consumer_offsets in topic listing; don't count it
  const topicCount = cluster.topics.filter((topic) => topic !== '__consumer_offsets').length
  if (limits.max_topics) {
    lines.push({
      name: 'Topics',
      values: [`${pixelBar(topicCount, limits.max_topics)} ${topicCount} / ${limits.max_topics} topics, see heroku kafka:topics`]
    })
  } else {
    lines.push({
      name: 'Topics',
      values: [`${topicCount} ${humanize.pluralize(topicCount, 'topic')}, see heroku kafka:topics`]
    })
  }

  if (cluster.topic_prefix) {
    lines.push({ name: 'Prefix', values: [cluster.topic_prefix] })
  }

  if (limits.max_partition_replica_count) {
    lines.push({
      name: 'Partitions',
      values: [ `${pixelBar(cluster.partition_replica_count, limits.max_partition_replica_count)} ${cluster.partition_replica_count} / ${limits.max_partition_replica_count} partition ${humanize.pluralize(cluster.partition_replica_count, 'replica')} (partitions × replication factor)` ]
    })
  }

  lines.push({
    name: 'Messages',
    values: [`${humanize.intComma(cluster.messages_in_per_sec)} ${humanize.pluralize(cluster.messages_in_per_sec, 'message')}/s`]
  })

  lines.push({
    name: 'Traffic',
    values: [`${humanize.fileSize(cluster.bytes_in_per_sec)}/s in / ${humanize.fileSize(cluster.bytes_out_per_sec)}/s out`]
  })

  if (cluster.data_size !== undefined && limits.data_size.limit_bytes !== undefined) {
    let size = cluster.data_size
    let limit = limits.data_size.limit_bytes
    let percentage = ((size / limit) * 100.0).toFixed(2)
    lines.push({
      name: 'Data Size',
      values: [`${pixelBar(size, limit)} ${humanize.fileSize(size)} / ${humanize.fileSize(limit)} (${percentage}%)`]
    })
  }

  lines.push({name: 'Add-on', values: [cli.color.addon(addon.name)]})

  return lines
}

function displayCluster (cluster) {
  cli.styledHeader(cluster.configVars.map(c => cli.color.configVar(c)).join(', '))

  let clusterInfo = formatInfo(cluster)
  let info = clusterInfo.reduce((info, i) => {
    if (i.values.length > 0) {
      info[i.name] = i.values.join(', ')
    }
    return info
  }, {})
  let keys = clusterInfo.map(i => i.name)

  cli.styledObject(info, keys)
  cli.log()
}

function * run (context, heroku) {
  const sortBy = require('lodash.sortby')
  const host = require('../lib/host')
  const fetcher = require('../lib/fetcher')(heroku)
  const app = context.app
  const cluster = context.args.CLUSTER

  let addons = []
  let attachments = heroku.get(`/apps/${app}/addon-attachments`)

  if (cluster) {
    addons = yield [fetcher.addon(app, cluster)]
  } else {
    addons = yield fetcher.all(app)
    if (addons.length === 0) {
      cli.log(`${cli.color.app(app)} has no heroku-kafka clusters.`)
      return
    }
  }

  let clusters = yield addons.map(addon => {
    return {
      addon,
      attachments,
      cluster: heroku.request({
        host: host(addon),
        method: 'get',
        path: `/data/kafka/v0/clusters/${addon.id}`
      }).catch(err => {
        if (err.statusCode !== 404) throw err
        cli.warn(`${cli.color.addon(addon.name)} is not yet provisioned.\nRun ${cli.color.cmd('heroku kafka:wait')} to wait until the cluster is provisioned.`)
      })
    }
  })

  clusters = clusters.filter(cluster => cluster.cluster)
  clusters.forEach(cluster => { cluster.configVars = configVarsFromName(cluster.attachments, cluster.addon.name) })
  clusters = sortBy(clusters, cluster => cluster.configVars[0] !== 'KAFKA_URL', 'configVars[0]')

  clusters.forEach(displayCluster)
}

let cmd = {
  topic: 'kafka',
  description: 'display cluster information',
  needsApp: true,
  needsAuth: true,
  args: [{name: 'CLUSTER', optional: true}],
  run: cli.command({preauth: true}, co.wrap(run))
}

exports.displayCluster = displayCluster
exports.root = cmd
exports.info = Object.assign({}, cmd, {command: 'info'})
