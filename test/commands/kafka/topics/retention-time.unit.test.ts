import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import nock from 'nock'
import {runCommand} from '../../../helpers/run-command.js'
import TopicsRetentionTime from '../../../../commands/kafka/topics/retention-time.js'

const VERSION = 'v0'

describe('kafka:topics:retention-time', () => {
  let kafka: nock.Scope

  const topicsUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/topics`
  }

  const topicUrl = (cluster: string, topic: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/topics/${topic}`
  }

  const infoUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('shows an error and exits with an unknown retention time value', async () => {
    const {error} = await runCommand(TopicsRetentionTime, ['topic-1', '1 fortnight', '--app', 'myapp'])
    expect(error?.message).to.include("Unknown retention time '1 fortnight'")
    expect(error?.message).to.include("expected 'disable' or value like '36h' or '10d'")
  })

  it('sets the retention time when the cleanup policy is mixed', async () => {
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

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {topics: [{name: 'topic-1', retention_time_ms: 123, compaction: true}]})
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {
        capabilities: {supports_mixed_cleanup_policy: true},
        limits: {minimum_retention_ms: 100}
      })
    kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

    const {stdout} = await runCommand(TopicsRetentionTime, ['topic-1', '10d', '--app', 'myapp'])
    expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
    api.done()
    kafka.done()
  })

  it('sets retention time to infinite when disabling with a mixed cleanup policy', async () => {
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

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {topics: [{name: 'topic-1', retention_time_ms: 123, compaction: true}]})
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {capabilities: {supports_mixed_cleanup_policy: true}})
    kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

    const {stdout} = await runCommand(TopicsRetentionTime, ['topic-1', 'disable', '--app', 'myapp'])
    expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
    api.done()
    kafka.done()
  })

  it('sets the retention time and disables compaction when the cleanup policy is not mixed', async () => {
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

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {topics: [{name: 'topic-1', retention_time_ms: 123, compaction: false}]})
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {
        capabilities: {supports_mixed_cleanup_policy: false},
        limits: {minimum_retention_ms: 100}
      })
    kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

    const {stdout} = await runCommand(TopicsRetentionTime, ['topic-1', '10d', '--app', 'myapp'])
    expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
    api.done()
    kafka.done()
  })

  it('enables compaction when disabling retention time with a non-mixed cleanup policy', async () => {
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

    kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {topics: [{name: 'topic-1', retention_time_ms: 123, compaction: false}]})
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {capabilities: {supports_mixed_cleanup_policy: false}})
    kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

    const {stdout} = await runCommand(TopicsRetentionTime, ['topic-1', 'disable', '--app', 'myapp'])
    expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
    api.done()
    kafka.done()
  })
})
