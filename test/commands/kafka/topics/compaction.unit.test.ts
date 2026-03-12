import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import nock from 'nock'
import {runCommand} from '../../../helpers/run-command.js'
import TopicsCompaction from '../../../../commands/kafka/topics/compaction.js'

const VERSION = 'v0'

describe('kafka:topics:compaction', () => {
  let kafka: nock.Scope

  const topicUrl = (cluster: string, topic: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/topics/${topic}`
  }

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

  it('shows an error and exits with unknown value', async () => {
    const {error} = await runCommand(TopicsCompaction, ['topic-1', 'yep', '--app', 'myapp'])
    expect(error?.message).to.include("Unknown value 'yep'")
    expect(error?.message).to.include("must be 'on' or 'enable' to enable, or 'off' or 'disable' to disable")
  })

  describe('if the cluster supports a mixed cleanup policy', () => {
    const validEnable = ['enable', 'on']
    const validDisable = ['disable', 'off']

    validEnable.forEach((value) => {
      it(`uses the original retention and turns compaction on with argument ${value}`, async () => {
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

        kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
          .reply(200, {
            capabilities: {supports_mixed_cleanup_policy: true},
            limits: {minimum_retention_ms: 20}
          })
        kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000'))
          .reply(200, {topics: [{name: 'topic-1', retention_time_ms: 123}]})
        kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

        const {stdout} = await runCommand(TopicsCompaction, ['topic-1', value, '--app', 'myapp'])
        expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
        api.done()
        kafka.done()
      })
    })

    validDisable.forEach((value) => {
      it(`turns compaction off and uses current retention value if set with argument ${value}`, async () => {
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

        kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
          .reply(200, {
            capabilities: {supports_mixed_cleanup_policy: true},
            limits: {minimum_retention_ms: 20}
          })
        kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000'))
          .reply(200, {topics: [{name: 'topic-1', retention_time_ms: 123, compaction: true}]})
        kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

        const {stdout} = await runCommand(TopicsCompaction, ['topic-1', value, '--app', 'myapp'])
        expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
        api.done()
        kafka.done()
      })

      it(`turns compaction off and sets retention to plan minimum if unset with argument ${value}`, async () => {
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

        kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
          .reply(200, {
            capabilities: {supports_mixed_cleanup_policy: true},
            limits: {minimum_retention_ms: 20}
          })
        kafka.get(topicsUrl('00000000-0000-0000-0000-000000000000'))
          .reply(200, {topics: [{name: 'topic-1', compaction: true}]})
        kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

        const {stdout} = await runCommand(TopicsCompaction, ['topic-1', value, '--app', 'myapp'])
        expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
        api.done()
        kafka.done()
      })
    })
  })

  describe('if the cluster does not support a mixed cleanup policy', () => {
    const validEnable = ['enable', 'on']
    const validDisable = ['disable', 'off']

    validEnable.forEach((value) => {
      it(`turns off retention and turns compaction on with argument ${value}`, async () => {
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
          .reply(200, {topics: [{name: 'topic-1', compaction: true}]})
        kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
          .reply(200, {
            capabilities: {supports_mixed_cleanup_policy: false},
            limits: {minimum_retention_ms: 20}
          })
        kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

        const {stdout} = await runCommand(TopicsCompaction, ['topic-1', value, '--app', 'myapp'])
        expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
        api.done()
        kafka.done()
      })
    })

    validDisable.forEach((value) => {
      it(`turns compaction off and sets retention to plan minimum with argument ${value}`, async () => {
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
          .reply(200, {topics: [{name: 'topic-1', compaction: true}]})
        kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
          .reply(200, {
            capabilities: {supports_mixed_cleanup_policy: false},
            limits: {minimum_retention_ms: 20}
          })
        kafka.put(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

        const {stdout} = await runCommand(TopicsCompaction, ['topic-1', value, '--app', 'myapp'])
        expect(stdout).to.include('Use `heroku kafka:topics:info topic-1` to monitor your topic.')
        api.done()
        kafka.done()
      })
    })
  })
})
