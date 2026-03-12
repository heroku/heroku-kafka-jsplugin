import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import esmock from 'esmock'
import cli from '@heroku/heroku-cli-util'
import nock from 'nock'
import { Addon } from '../../lib/shared.js'

const withCluster = async (heroku: any, app: string, cluster: string | undefined, callback: (addon: Addon) => Promise<void>) => {
  await callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: { name: 'test' } })
}

let lastApp: string | null
let lastConfirm: string | undefined | null
let lastMsg: string | null

const confirmApp = async (app: string, confirm: string | undefined, msg: string) => {
  lastApp = app
  lastConfirm = confirm
  lastMsg = msg
}

const VERSION = 'v0'

const cmd = await esmock('../../commands/consumer_groups_destroy.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})

describe('kafka:consumer-groups:destroy', () => {
  let confirm: any
  let kafka: nock.Scope

  const consumerGroupsUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/consumer_groups`
  }

  beforeEach(() => {
    confirm = cli.confirmApp
    kafka = nock('https://api.data.heroku.com:443')

    cli.exit.mock()
    cli.confirmApp = confirmApp as any
    cli.mockConsole()
  })

  afterEach(() => {
    cli.confirmApp = confirm
    nock.cleanAll()
    kafka.done()
  })

  it('destroys a consumer group on the cluster', () => {
    kafka.delete(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'),
      {
        consumer_group: {
          name: 'consumer-group-1'
        }
      }
    ).reply(200)

    return cmd.default.run({app: 'myapp',
      args: { CONSUMER_GROUP: 'consumer-group-1' },
      flags: { confirm: 'myapp' }})
      .then(() => {
        expect(cli.stdout).to.equal('Your consumer group has been deleted\n')
      })
  })

  it('requires app confirmation', () => {
    const message = 'This command will affect the cluster: kafka-1, which is on myapp'

    kafka.delete(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'),
      {
        consumer_group: {
          name: 'consumer-group-1'
        }
      }
    ).reply(200)

    lastApp = null
    lastConfirm = null
    lastMsg = null

    return cmd.default.run({app: 'myapp',
      args: { CONSUMER_GROUP: 'consumer-group-1' },
      flags: { confirm: 'myapp' }})
      .then(() => {
        expect(lastApp).to.equal('myapp')
        expect(lastConfirm).to.equal('myapp')
        expect(lastMsg).to.equal(message)
      })
  })
})
