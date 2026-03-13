import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import TopicsReplicationFactor from '../../../../src/commands/kafka/topics/replication-factor.js'
import {runCommand} from '../../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:topics:replication-factor', () => {
  let kafka: nock.Scope

  const topicsUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/topics`
  }

  const topicUrl = (cluster: string, topic: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/topics/${topic}`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('sets replication factor to the specified value', async () => {
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

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000'))
    .reply(200, {topics: [{compaction: true, name: 'topic-1', retention_time_ms: 123}]})
    kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

    const {stdout} = await runCommand(TopicsReplicationFactor, ['topic-1', '5', '--app', 'myapp'])
    expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
    api.done()
    kafka.done()
  })
})
