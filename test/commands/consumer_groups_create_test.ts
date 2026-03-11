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

const cmd = await esmock('../../commands/consumer_groups_create.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})

describe('kafka:consumer-groups:create', () => {
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

  it('creates a consumer group on the cluster', () => {
    kafka.post(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'),
      {
        consumer_group: {
          name: 'consumer-group-1'
        }
      }
    ).reply(200)

    return cmd.default.run({app: 'myapp',
      args: { CONSUMER_GROUP: 'consumer-group-1' }})
      .then(() => {
        expect(cli.stdout).to.equal('Use `heroku kafka:consumer-groups` to list your consumer groups.\n')
      })
  })

  it('doesn\'t raise when the api 400s', () => {
    kafka.post(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'),
      {
        consumer_group: {
          name: 'consumer-group-1'
        }
      }
    ).reply(400, {message: 'this command is not required or enabled on dedicated clusters'})

    return cmd.default.run({app: 'myapp',
      args: { CONSUMER_GROUP: 'consumer-group-1' }})
      .then(() => {
        expect(cli.stderr).to.equal('Creating consumer group consumer-group-1... !\n ▸    kafka-1 does not need consumer groups managed explicitly, so this command\n ▸    does nothing\n')
      })
  })
})
