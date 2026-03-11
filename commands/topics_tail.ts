import cli from '@heroku/heroku-cli-util'
import debug from '../lib/debug.js'
import {clusterConfig} from '../lib/shared.js'
import {withCluster} from '../lib/clusters.js'
import { Addon } from '../lib/shared.js'
import { HerokuClient } from '../types/command.js'

const CLIENT_ID = 'heroku-tail-consumer'
const IDLE_TIMEOUT = 1000
const MAX_LENGTH = 80

interface Context {
  app: string
  args: {
    TOPIC: string
    CLUSTER?: string
  }
  flags: {
    'max-length'?: string
  }
}

async function tail (context: Context, heroku: HerokuClient): Promise<void> {
  const kafka = await import('@heroku/no-kafka')
  await withCluster(heroku, context.app, context.args.CLUSTER, async (addon: Addon) => {
    let appConfig = await heroku.get(`/apps/${context.app}/config-vars`)
    let attachment = await heroku.get(`/apps/${context.app}/addon-attachments/${addon.name}`,
      { headers: { 'accept-inclusion': 'config_vars' } })
    let config = clusterConfig(attachment, appConfig)
    let consumer = new kafka.default.SimpleConsumer({
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
      await consumer.init()
    } catch (e) {
      debug(e)
      cli.exit(1, 'Could not connect to kafka')
    }

    var topicName = context.args.TOPIC
    if (config.prefix && !topicName.startsWith(config.prefix)) {
      topicName = config.prefix + topicName
    }

    return new Promise<void>((resolve, reject) => {
      // N.B.: we never call resolve unless we see a SIGINT because
      // tail is meant to keep going indefinitely
      process.once('SIGINT', resolve)
      try {
        consumer.subscribe(topicName, (messageSet: any, topic: any, partition: any) => {
          messageSet.forEach((m: any) => {
            let buffer = m.message.value
            if (buffer == null) {
              cli.log(context.args.TOPIC, partition, m.offset, 0, 'NULL')
              return
            }
            let length = Math.min(buffer.length, parseInt(context.flags['max-length']) || MAX_LENGTH)
            let body = buffer.toString('utf8', 0, length)
            cli.log(context.args.TOPIC, partition, m.offset, buffer.length, body)
          })
        })
      } catch (e) {
        debug(e)
        cli.exit(1, 'Could not subscribe to topic')
      }
    })
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
  flags: [
    { name: 'max-length', description: 'number of characters per message to output', hasValue: true }
  ],
  help: `
    Consumes messages from a topic in Kafka.  Note: For Private and Shield plans,
    configure mutual TLS first to allow external connections to your cluster.

    Examples:

    $ heroku kafka:topics:tail page-visits
    $ heroku kafka:topics:tail page-visits kafka-aerodynamic-32763
    $ heroku kafka:topics:tail page-visits --max-length 200
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(tail)
}

export {cmd}
