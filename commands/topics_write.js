import cli from '@heroku/heroku-cli-util'
import debug from '../lib/debug.js'
import {clusterConfig} from '../lib/shared.js'
import {withCluster} from '../lib/clusters.js'

const CLIENT_ID = 'heroku-write-producer'
const IDLE_TIMEOUT = 1000

async function write (context, heroku) {
  const kafka = await import('@heroku/no-kafka')
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon) => {
    let appConfig = await heroku.get(`/apps/${context.app}/config-vars`)
    let attachment = await heroku.get(`/apps/${context.app}/addon-attachments/${addon.name}`,
      { headers: { 'accept-inclusion': 'config_vars' } })
    let config = clusterConfig(attachment, appConfig)

    let producer = new kafka.default.Producer({
      idleTimeout: IDLE_TIMEOUT,
      clientId: CLIENT_ID,
      connectionString: config.url,
      ssl: {
        clientCert: config.clientCert,
        clientCertKey: config.clientCertKey
      },
      logger: {
        logLevel: 0
      }
    })

    try {
      await producer.init()
    } catch (e) {
      debug(e)
      cli.exit(1, 'Could not connect to kafka')
    }

    var topicName = context.args.TOPIC
    if (config.prefix && !topicName.startsWith(config.prefix)) {
      topicName = config.prefix + topicName
    }

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

    try {
      await producer.send(payload)
      producer.end()
    } catch (e) {
      debug(e)
      cli.exit(1, 'Could not write to topic')
    }
  })
}

let cmd = {
  topic: 'kafka',
  command: 'topics:write',
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
    Writes a message to the specified Kafka topic. Note: For Private and Shield plans,
    configure mutual TLS first to allow external connections to your cluster.

    Examples:

    $ heroku kafka:topics:write page_visits "1441025138,www.example.com,192.168.2.13"
    $ heroku kafka:topics:write page_visits "1441025138,www.example.com,192.168.2.13" kafka-aerodynamic-32763
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(write)
}

export {cmd}
