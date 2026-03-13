import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import TopicsCreate from '../../../../src/commands/kafka/topics/create.js'
import {runCommand} from '../../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:topics:create', () => {
  let kafka: nock.Scope

  const topicsUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/topics`
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

  it('shows an error and exits with an invalid retention time', async () => {
    const {error} = await runCommand(TopicsCreate, ['topic-1', '--app', 'myapp', '--retention-time', '2 eons'])
    expect(error?.message).to.include("Could not parse retention time '2 eons'")
    expect(error?.message).to.include("expected value like '10d' or '36h'")
  })

  it('passes the topic name and specified flags', async () => {
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

    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
    .reply(200, {shared_cluster: false})
    kafka.post(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200)

    const {stdout} = await runCommand(TopicsCreate, [
      'topic-1',
      '--app',
      'myapp',
      '--replication-factor',
      '3',
      '--retention-time',
      '10ms',
      '--partitions',
      '7',
    ])
    expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
    api.done()
    kafka.done()
  })

  it('includes the topic prefix and link in output if one exists', async () => {
    const prefix = 'mill-4567.'
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

    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
    .reply(200, {topic_prefix: prefix})
    kafka.post(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200)

    const {stdout} = await runCommand(TopicsCreate, [
      'topic-1',
      '--app',
      'myapp',
      '--replication-factor',
      '3',
      '--retention-time',
      '10ms',
      '--partitions',
      '7',
    ])
    expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
    expect(stdout).to.include(`Your topic is using the prefix ${prefix}`)
    expect(stdout).to.include('https://devcenter.heroku.com/articles/multi-tenant-kafka-on-heroku#connecting-kafka-prefix')
    api.done()
    kafka.done()
  })

  it('defaults retention to the plan minimum if not specified', async () => {
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

    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
    .reply(200, {limits: {minimum_retention_ms: 66}, shared_cluster: false})
    kafka.post(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200)

    const {stdout} = await runCommand(TopicsCreate, [
      'topic-1',
      '--app',
      'myapp',
      '--replication-factor',
      '3',
      '--partitions',
      '7',
    ])
    expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
    api.done()
    kafka.done()
  })

  describe('for multi-tenant plans', () => {
    it('defaults retention to the plan minimum if not specified even if compaction specified', async () => {
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

      kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, {limits: {minimum_retention_ms: 66}, shared_cluster: true})
      kafka.post(topicsUrl('00000000-0000-0000-0000-000000000000')).reply(200)

      const {stdout} = await runCommand(TopicsCreate, [
        'topic-1',
        '--app',
        'myapp',
        '--replication-factor',
        '3',
        '--partitions',
        '7',
        '--compaction',
      ])
      expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
      api.done()
      kafka.done()
    })
  })
})
