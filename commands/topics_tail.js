'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const kafka = require('no-kafka')

const debug = require('../lib/debug')
const clusterConfig = require('../lib/shared').clusterConfig
const deprecated = require('../lib/shared').deprecated
const withCluster = require('../lib/clusters').withCluster

const CLIENT_ID = 'heroku-tail-consumer'
const IDLE_TIMEOUT = 1000
const MAX_LENGTH = 80

function * tail (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    if (addon.plan.name.startsWith('heroku-kafka:private-')) {
      cli.exit(1, '`kafka:topics:tail` is not available in Heroku Private Spaces')
    }

    let appConfig = yield heroku.get(`/apps/${context.app}/config-vars`)
    let attachment = yield heroku.get(`/apps/${context.app}/addon-attachments/${addon.name}`)
    let config = clusterConfig(attachment, appConfig)
    let consumer = new kafka.SimpleConsumer({
      idleTimeout: IDLE_TIMEOUT,
      clientId: CLIENT_ID,
      connectionString: config.url,
      ssl: {
        clientCert: config.clientCert,
        clientCertKey: config.clientCertKey
      }
    })
    try {
      yield consumer.init()
    } catch (e) {
      debug(e)
      cli.exit(1, 'Could not connect to kafka')
    }

    try {
      consumer.subscribe(context.args.TOPIC, (messageSet, topic, partition) => {
        messageSet.forEach((m) => {
          let buffer = m.message.value
          if (buffer == null) {
            cli.log(context.args.TOPIC, partition, m.offset, 0, 'NULL')
            return
          }
          let length = Math.min(buffer.length, MAX_LENGTH)
          let body = buffer.toString('utf8', 0, length)
          cli.log(context.args.TOPIC, partition, m.offset, buffer.length, body)
        })
      })
    } catch (e) {
      debug(e)
      cli.exit(1, 'Could not subscribe to topic')
    }
  })
}

let cmd = {
  topic: 'kafka',
  command: 'topics:tail',
  description: 'tails a topic in Kafka',
  args: [
    { name: 'TOPIC' },
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Tails a topic in Kafka. Note: kafka:tail is not available in Heroku Private Spaces.

    Examples:

    $ heroku kafka:topics:tail page-visits
    $ heroku kafka:topics:tail page-visits kafka-aerodynamic-32763
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(tail))
}

module.exports = {
  cmd,
  deprecated: Object.assign({}, cmd, { command: 'tail',
                                       hidden: true,
                                       run: cli.command(co.wrap(deprecated(tail, cmd.command))) })
}
