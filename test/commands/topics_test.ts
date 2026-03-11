import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'




import esmock from 'esmock'

import cli from '@heroku/heroku-cli-util'
import nock from 'nock'
import { Addon } from '../../lib/shared.js'

const withCluster = async (
  heroku: any,
  app: string,
  cluster: string | undefined,
  callback: (addon: Addon) => Promise<void>
) => {
  await callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: { name: 'test' } })
}

const cmd = (await esmock('../../commands/topics.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})).cmd

describe('kafka:topics', () => {
  let kafka: nock.Scope

  const topicsUrl = (cluster: string):string => {
    return `/data/kafka/v0/clusters/${cluster}/topics`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
    cli.mockConsole()
    cli.exit.mock()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  describe('with no topics in the cluster', () => {
    it('indicates there are no topics', () => {
      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        limits: {
          max_topics: 10
        },
        topics: []
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL

No topics found on this Kafka cluster.
Use heroku kafka:topics:create to create a topic (limit 10).
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })

    it('ignores the __consumer_offsets topic', () => {
      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          { name: '__consumer_offsets', messages_in_per_second: 9.0, bytes_in_per_second: 2 }
        ]
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL

No topics found on this Kafka cluster.
Use heroku kafka:topics:create to create a topic.
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })
  })

  describe('with some topics in the cluster', () => {
    it('displays information about these topics', () => {
      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          { name: 'topic-1', messages_in_per_second: 10.0, bytes_in_per_second: 0 },
          { name: 'topic-2', messages_in_per_second: 12.0, bytes_in_per_second: 3 }
        ],
        limits: {
          max_topics: 10
        }
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL
2 / 10 topics

Name     Messages  Traffic
───────  ────────  ───────────
topic-1  10/sec    0 bytes/sec
topic-2  12/sec    3 bytes/sec
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })

    it('includes prefix information if one exists', () => {
      const prefix = 'russian-12345.'
      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        prefix,
        topics: [
          { name: 'topic-1', messages_in_per_second: 10.0, bytes_in_per_second: 0 },
          { name: 'topic-2', messages_in_per_second: 12.0, bytes_in_per_second: 3 }
        ],
        limits: {
          max_topics: 10
        }
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL
2 / 10 topics; prefix: ${prefix}

Name     Messages  Traffic
───────  ────────  ───────────
topic-1  10/sec    0 bytes/sec
topic-2  12/sec    3 bytes/sec
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })

    it('omits information about the special __consumer_offsets topic', () => {
      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          { name: '__consumer_offsets', messages_in_per_second: '9.0', bytes: '2' },
          { name: 'topic-1', messages_in_per_second: 10.0, bytes_in_per_second: 0 },
          { name: 'topic-2', messages_in_per_second: 12.0, bytes_in_per_second: 3 }
        ]
      })

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== Kafka Topics on HEROKU_KAFKA_BLUE_URL

Name     Messages  Traffic
───────  ────────  ───────────
topic-1  10/sec    0 bytes/sec
topic-2  12/sec    3 bytes/sec
`))
        .then(() => expect(cli.stderr).to.be.empty)
    })
  })
})
