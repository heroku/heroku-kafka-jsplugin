'use strict'

const cli = require('heroku-cli-util')
const co = require('co')
const kafka = require('no-kafka')

const HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters
const clusterConfig = require('./shared.js').clusterConfig

const CLIENT_ID = 'heroku-write-producer'
const IDLE_TIMEOUT = 1000

function * write (context, heroku) {
  let clusters = new HerokuKafkaClusters(heroku, process.env, context)
  let addon = yield clusters.addonForSingleClusterCommand(context.args.CLUSTER)
  if (!addon) {
    process.exit(1)
  }
  let appConfig = yield heroku.apps(context.app).configVars().info()
  let config = clusterConfig(addon, appConfig)

  let producer = new kafka.Producer({
    idleTimeout: IDLE_TIMEOUT,
    clientId: CLIENT_ID,
    connectionString: config.url,
    ssl: {
      clientCert: config.clientCert,
      clientCertKey: config.clientCertKey
    }
  })
  yield producer.init()

  const topicName = context.args.TOPIC
  const partition = parseInt(context.flags.partition) || 0
  const key = context.flags.key

  const message = { value: context.args.MESSAGE }
  if (key) {
    message.key = key
  }

  const payload = {
    topic: topicName,
    partition: partition,
    message: message
  }

  yield producer.send(payload)
  producer.end()
}

module.exports = {
  topic: 'kafka',
  command: 'write',
  description: 'writes a message to a Kafka topic',
  args: [
    { name: 'TOPIC' },
    { name: 'MESSAGE' },
    { name: 'CLUSTER', optional: true }
  ],
  flags: [
    { name: 'key', description: 'the key for this message', hasValue: true },
    { name: 'partition', description: 'the partition to write to', hasValue: true }
  ],
  help: `
    Writes a message to the specified Kafka topic.

    Examples:

    $ heroku kafka:write page_visits "1441025138,www.example.com,192.168.2.13"
    $ heroku kafka:write page_visits "1441025138,www.example.com,192.168.2.13" kafka-aerodynamic-32763
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(write))
}
