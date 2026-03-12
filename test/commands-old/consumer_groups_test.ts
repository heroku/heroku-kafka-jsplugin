import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import esmock from 'esmock'
import cli from '@heroku/heroku-cli-util'
import nock from 'nock'
import { Addon } from '../../lib/shared.ts'

const withCluster = async (heroku: any, app: string, cluster: string | undefined, callback: (addon: Addon) => Promise<void>) => {
  await callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: { name: 'test' } })
}

const VERSION = 'v0'

const cmd = await esmock('../../commands/consumer_groups.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})

describe('kafka:consumer-groups', () => {
  let kafka: nock.Scope

  const consumerGroupsUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/consumer_groups`
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

  it('displays a list of consumer groups', () => {
    kafka.get(consumerGroupsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA',
      consumer_groups: [
        { name: 'consumer-group-1' },
        { name: 'consumer-group-2' }
      ]
    })

    return cmd.run({app: 'myapp', args: {}})
      .then(() => expect(cli.stdout).to.equal(`=== Kafka Consumer Groups on HEROKU_KAFKA

Name
────────────────
consumer-group-1
consumer-group-2
`))
      .then(() => expect(cli.stderr).to.be.empty)
  })
})
