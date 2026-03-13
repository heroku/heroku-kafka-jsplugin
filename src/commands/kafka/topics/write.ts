import {Command, flags} from '@heroku-cli/command'
import {Args} from '@oclif/core'

import {withCluster} from '../../../lib/clusters.js'
import debug from '../../../lib/debug.js'
import * as kafka from '../../../lib/kafka.js'
import {Addon, clusterConfig} from '../../../lib/shared.js'

const CLIENT_ID = 'heroku-write-producer'
const IDLE_TIMEOUT = 1000

export default class TopicsWrite extends Command {
  static args = {
    topic: Args.string({description: 'topic name', required: true}),
    message: Args.string({description: 'message to write', required: true}),
    cluster: Args.string({description: 'cluster to operate on', required: false}),
  }
  static description = 'writes a message to a Kafka topic'
  static examples = [
    '$ heroku kafka:topics:write page_visits "1441025138,www.example.com,192.168.2.13"',
    '$ heroku kafka:topics:write page_visits "1441025138,www.example.com,192.168.2.13" kafka-aerodynamic-32763',
  ]
  static flags = {
    app: flags.app({required: true}),
    remote: flags.remote(),
    key: flags.string({description: 'the key for this message'}),
    partition: flags.string({description: 'the partition to write to'}),
  }
  static topic = 'kafka'

  async run() {
    const {args, flags} = await this.parse(TopicsWrite)

    await withCluster(this.heroku, flags.app, args.cluster, async (addon: Addon) => {
      const {body: appConfig}: any = await this.heroku.get(`/apps/${flags.app}/config-vars`)
      const {body: attachment}: any = await this.heroku.get(
        `/apps/${flags.app}/addon-attachments/${addon.name}`,
        {headers: {'accept-inclusion': 'config_vars'}},
      )
      const config = clusterConfig(attachment, appConfig)

      const producer = await kafka.createProducer({
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
        await producer.init()
      } catch (error) {
        debug(error)
        this.error('Could not connect to kafka')
      }

      let topicName = args.topic
      if (config.prefix && !topicName.startsWith(config.prefix)) {
        topicName = config.prefix + topicName
      }

      const partition = parseInt(flags.partition) || 0
      const {key} = flags

      const message: any = {value: args.message}
      if (key) {
        message.key = key
      }

      const payload = {
        topic: topicName,
        partition,
        message,
      }

      try {
        await producer.send(payload)
        producer.end()
      } catch (error) {
        debug(error)
        this.error('Could not write to topic')
      }
    })
  }
}
