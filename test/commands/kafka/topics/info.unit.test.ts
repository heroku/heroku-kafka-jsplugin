import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import TopicsInfo from '../../../../src/commands/kafka/topics/info.js'
import {runCommand} from '../../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:topics:info', () => {
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

  it('displays the topic info', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
    }])

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA_BLUE_URL',
      topics: [
        {
          bytes_in_per_second: 0,
          bytes_out_per_second: 0,
          compaction: false,
          messages_in_per_second: 0,
          name: 'topic-1',
          partitions: 3,
          replication_factor: 3,
          retention_time_ms: 86400000,
        },
      ],
    })

    const {stdout} = await runCommand(TopicsInfo, ['topic-1', '--app', 'myapp'])
    expect(stdout).to.include('kafka-1 :: topic-1')
    expect(stdout).to.match(/Producers:\s+0 messages\/second \(0 bytes\/second\) total/)
    expect(stdout).to.match(/Consumers:\s+0 bytes\/second total/)
    expect(stdout).to.match(/Partitions:\s+3 partitions/)
    expect(stdout).to.match(/Replication Factor:\s+3/)
    expect(stdout).to.match(/Compaction:\s+Compaction is disabled for topic-1/)
    expect(stdout).to.match(/Retention:\s+24 hours/)
    api.done()
    kafka.done()
  })

  it('displays a topic prefix if one is specified', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
    }])

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA_BLUE_URL',
      topics: [
        {
          bytes_in_per_second: 0,
          bytes_out_per_second: 0,
          compaction: false,
          messages_in_per_second: 0,
          name: 'topic-1',
          partitions: 3,
          prefix: 'wisła-12345.',
          replication_factor: 3,
          retention_time_ms: 86400000,
        },
      ],
    })

    const {stdout} = await runCommand(TopicsInfo, ['topic-1', '--app', 'myapp'])
    expect(stdout).to.include('kafka-1 :: topic-1')
    expect(stdout).to.match(/Topic Prefix:\s+wisła-12345\./)
    expect(stdout).to.match(/Producers:\s+0 messages\/second \(0 bytes\/second\) total/)
    api.done()
    kafka.done()
  })

  it('tells user the topic is not ready', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
    }])

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA_BLUE_URL',
      topics: [
        {
          bytes_in_per_second: 0,
          bytes_out_per_second: 0,
          compaction: false,
          messages_in_per_second: 0,
          name: 'topic-1',
          partitions: 0,
          replication_factor: 0,
          retention_time_ms: 86400000,
        },
      ],
    })

    const {error} = await runCommand(TopicsInfo, ['topic-1', '--app', 'myapp'])
    expect(error?.message).to.include('topic topic-1 is not available yet')
    api.done()
    kafka.done()
  })

  it('tells user the topic does not exist', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
    }])

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA_BLUE_URL',
      topics: [
        {
          bytes_in_per_second: 0,
          bytes_out_per_second: 0,
          compaction: false,
          messages_in_per_second: 0,
          name: 'topic-2',
          partitions: 0,
          replication_factor: 0,
          retention_time_ms: 86400000,
        },
      ],
    })

    const {error} = await runCommand(TopicsInfo, ['topic-1', '--app', 'myapp'])
    expect(error?.message).to.include('topic topic-1 not found')
    api.done()
    kafka.done()
  })
})
