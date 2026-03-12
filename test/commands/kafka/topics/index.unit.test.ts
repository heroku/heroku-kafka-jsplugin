import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import nock from 'nock'
import {runCommand} from '../../../helpers/run-command.js'
import Topics from '../../../../src/commands/kafka/topics/index.js'

const VERSION = 'v0'

describe('kafka:topics', () => {
  let kafka: nock.Scope

  const topicsUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/topics`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('with no topics in the cluster', () => {
    it('indicates there are no topics', async () => {
      const api = nock('https://api.heroku.com:443')
        .get('/apps/myapp/addon-attachments')
        .reply(200, [{
          addon: {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'kafka-1',
            plan: {name: 'heroku-kafka:basic-0'}
          },
          name: 'KAFKA'
        }])

      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        limits: {
          max_topics: 10
        },
        topics: []
      })

      const {stdout} = await runCommand(Topics, ['--app', 'myapp'])
      expect(stdout).to.include('Kafka Topics on HEROKU_KAFKA_BLUE_URL')
      expect(stdout).to.include('No topics found on this Kafka cluster.')
      expect(stdout).to.include('Use heroku kafka:topics:create to create a topic (limit 10).')
      api.done()
      kafka.done()
    })

    it('ignores the __consumer_offsets topic', async () => {
      const api = nock('https://api.heroku.com:443')
        .get('/apps/myapp/addon-attachments')
        .reply(200, [{
          addon: {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'kafka-1',
            plan: {name: 'heroku-kafka:basic-0'}
          },
          name: 'KAFKA'
        }])

      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          {name: '__consumer_offsets', messages_in_per_second: 9.0, bytes_in_per_second: 2}
        ]
      })

      const {stdout} = await runCommand(Topics, ['--app', 'myapp'])
      expect(stdout).to.include('Kafka Topics on HEROKU_KAFKA_BLUE_URL')
      expect(stdout).to.include('No topics found on this Kafka cluster.')
      expect(stdout).to.include('Use heroku kafka:topics:create to create a topic.')
      api.done()
      kafka.done()
    })
  })

  describe('with some topics in the cluster', () => {
    it('displays information about these topics', async () => {
      const api = nock('https://api.heroku.com:443')
        .get('/apps/myapp/addon-attachments')
        .reply(200, [{
          addon: {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'kafka-1',
            plan: {name: 'heroku-kafka:basic-0'}
          },
          name: 'KAFKA'
        }])

      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          {name: 'topic-1', messages_in_per_second: 10.0, bytes_in_per_second: 0},
          {name: 'topic-2', messages_in_per_second: 12.0, bytes_in_per_second: 3}
        ],
        limits: {
          max_topics: 10
        }
      })

      const {stdout} = await runCommand(Topics, ['--app', 'myapp'])
      expect(stdout).to.include('Kafka Topics on HEROKU_KAFKA_BLUE_URL')
      expect(stdout).to.include('2 / 10 topics')
      expect(stdout).to.include('topic-1')
      expect(stdout).to.include('topic-2')
      expect(stdout).to.include('10/sec')
      expect(stdout).to.include('12/sec')
      api.done()
      kafka.done()
    })

    it('includes prefix information if one exists', async () => {
      const prefix = 'russian-12345.'
      const api = nock('https://api.heroku.com:443')
        .get('/apps/myapp/addon-attachments')
        .reply(200, [{
          addon: {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'kafka-1',
            plan: {name: 'heroku-kafka:basic-0'}
          },
          name: 'KAFKA'
        }])

      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        prefix,
        topics: [
          {name: 'topic-1', messages_in_per_second: 10.0, bytes_in_per_second: 0},
          {name: 'topic-2', messages_in_per_second: 12.0, bytes_in_per_second: 3}
        ],
        limits: {
          max_topics: 10
        }
      })

      const {stdout} = await runCommand(Topics, ['--app', 'myapp'])
      expect(stdout).to.include('Kafka Topics on HEROKU_KAFKA_BLUE_URL')
      expect(stdout).to.include(`2 / 10 topics; prefix: ${prefix}`)
      expect(stdout).to.include('topic-1')
      expect(stdout).to.include('topic-2')
      api.done()
      kafka.done()
    })

    it('omits information about the special __consumer_offsets topic', async () => {
      const api = nock('https://api.heroku.com:443')
        .get('/apps/myapp/addon-attachments')
        .reply(200, [{
          addon: {
            id: '00000000-0000-0000-0000-000000000000',
            name: 'kafka-1',
            plan: {name: 'heroku-kafka:basic-0'}
          },
          name: 'KAFKA'
        }])

      kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
        attachment_name: 'HEROKU_KAFKA_BLUE_URL',
        topics: [
          {name: '__consumer_offsets', messages_in_per_second: 9.0, bytes_in_per_second: 2},
          {name: 'topic-1', messages_in_per_second: 10.0, bytes_in_per_second: 0},
          {name: 'topic-2', messages_in_per_second: 12.0, bytes_in_per_second: 3}
        ]
      })

      const {stdout} = await runCommand(Topics, ['--app', 'myapp'])
      expect(stdout).to.include('Kafka Topics on HEROKU_KAFKA_BLUE_URL')
      expect(stdout).to.include('topic-1')
      expect(stdout).to.include('topic-2')
      expect(stdout).not.to.include('__consumer_offsets')
      api.done()
      kafka.done()
    })
  })
})
