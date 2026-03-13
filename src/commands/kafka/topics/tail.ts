import {Command, flags} from '@heroku-cli/command'
import {Args, ux} from '@oclif/core'

import {withCluster} from '../../../lib/clusters.js'
import debug from '../../../lib/debug.js'
import * as kafka from '../../../lib/kafka.js'
import {Addon, clusterConfig} from '../../../lib/shared.js'

const CLIENT_ID = 'heroku-tail-consumer'
const IDLE_TIMEOUT = 1000
const MAX_LENGTH = 80

export default class TopicsTail extends Command {
  static args = {
    topic: Args.string({description: 'topic name', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }
  static description = 'tails a topic in Kafka'
  static examples = [
    '$ heroku kafka:topics:tail page-visits',
    '$ heroku kafka:topics:tail page-visits kafka-aerodynamic-32763',
    '$ heroku kafka:topics:tail page-visits --max-length 200',
  ]
  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    'max-length': flags.string({description: 'number of characters per message to output'}),
  }
  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(TopicsTail)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const {body: appConfig}: any = await this.heroku.get(`/apps/${flags.app}/config-vars`)
      const {body: attachment}: any = await this.heroku.get(
        `/apps/${flags.app}/addon-attachments/${addon.name}`,
        {headers: {'accept-inclusion': 'config_vars'}},
      )
      const config = clusterConfig(attachment, appConfig)
      const consumer = await kafka.createSimpleConsumer({
        idleTimeout: IDLE_TIMEOUT,
        clientId: CLIENT_ID,
        connectionString: config.url,
        ssl: {
          clientCert: config.clientCert,
          clientCertKey: config.clientCertKey,
        },
        logger: {
          logLevel: 0,
        },
      })
      try {
        await consumer.init()
      } catch (error) {
        debug(error)
        this.error('Could not connect to kafka')
      }

      let topicName = args.topic
      if (config.prefix && !topicName.startsWith(config.prefix)) {
        topicName = config.prefix + topicName
      }

      return new Promise<void>(resolve => {
        // N.B.: we never call resolve unless we see a SIGINT because
        // tail is meant to keep going indefinitely
        process.once('SIGINT', resolve)
        try {
          consumer.subscribe(topicName, (messageSet: any, topic: any, partition: any) => {
            messageSet.forEach((m: any) => {
              const buffer = m.message.value
              if (buffer === null || buffer === undefined) {
                ux.stdout(`${args.topic} ${partition} ${m.offset} 0 NULL\n`)
                return
              }

              const length = Math.min(buffer.length, parseInt(flags['max-length'] || '') || MAX_LENGTH)
              const body = buffer.toString('utf8', 0, length)
              ux.stdout(`${args.topic} ${partition} ${m.offset} ${buffer.length} ${body}\n`)
            })
          })
        } catch (error) {
          debug(error)
          this.error('Could not subscribe to topic')
        }
      })
    })
  }
}
