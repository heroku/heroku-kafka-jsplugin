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

const cmd = await esmock('../../commands/topics_replication_factor.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})

describe('kafka:topics:replication-factor', () => {
  let kafka: nock.Scope

  const topicListUrl = (cluster: string):string => {
    return `/data/kafka/v0/clusters/${cluster}/topics`
  }

  let topicConfigUrl = (cluster, topic) => {
    return `/data/kafka/v0/clusters/${cluster}/topics/${topic}`
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

  it('sets replication factor to the specified value', () => {
    kafka.get(topicListUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, { topics: [ { name: 'topic-1', retention_time_ms: 123, compaction: true } ] })
    kafka.put(topicConfigUrl('00000000-0000-0000-0000-000000000000', 'topic-1'),
      { topic: { name: 'topic-1', replication_factor: '5', retention_time_ms: 123, compaction: true } }
    )
      .reply(200)

    return cmd.default.run({app: 'myapp', args: { TOPIC: 'topic-1', VALUE: '5' }})
      .then(() => expect(cli.stderr).to.equal('Setting replication factor for topic topic-1 to 5... done\n'))
      .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n'))
  })
})
