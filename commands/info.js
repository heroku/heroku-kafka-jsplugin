'use strict'

const co = require('co')
const cli = require('heroku-cli-util')

function configVarNamesFromAttachment (config, attachment) {
  const sortBy = require('lodash.sortby')

  let value = config[attachment]
  let keys = []
  for (let key of Object.keys(config)) {
    if (config[key] === value) {
      keys.push(key)
    }
  }
  return sortBy(keys, k => k !== 'KAFKA_URL', 'name')
}

function displayCluster (cluster) {
  cli.styledHeader(cluster.configVars.map(c => cli.color.configVar(c)).join(', '))
  cluster.cluster.info.push({name: 'Add-on', values: [cli.color.addon(cluster.addon.name)]})
  let info = cluster.cluster.info.reduce((info, i) => {
    if (i.values.length > 0) {
      info[i.name] = i.values.join(', ')
    }
    return info
  }, {})
  let keys = cluster.cluster.info.map(i => i.name)
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
  let config = heroku.get(`/apps/${app}/config-vars`)

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
      config,
      cluster: heroku.request({
        host: host(addon),
        method: 'get',
        path: `/client/kafka/v0/clusters/${addon.name}`
      }).catch(err => {
        if (err.statusCode !== 404) throw err
        cli.warn(`${cli.color.addon(addon.name)} is not yet provisioned.\nRun ${cli.color.cmd('heroku kafka:wait')} to wait until the cluster is provisioned.`)
      })
    }
  })

  clusters = clusters.filter(cluster => cluster.cluster)
  clusters.forEach(cluster => { cluster.configVars = configVarNamesFromAttachment(cluster.config, cluster.cluster.attachment_name) })
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
