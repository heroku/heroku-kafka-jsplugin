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

let lastApp: string | null
let lastConfirm: string | undefined | null
let lastMsg: string | null

const confirmApp = async (app: string, confirm: string | undefined, msg: string) => {
  lastApp = app
  lastConfirm = confirm
  lastMsg = msg
}

const cmd = (await esmock('../../commands/topics_destroy.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})).cmd

describe('kafka:topics:destroy', () => {
  let confirm
  let kafka: nock.Scope

  let deleteUrl = (cluster, topic) => {
    return `/data/kafka/v0/clusters/${cluster}/topics/${topic}`
  }

  beforeEach(() => {
    confirm = cli.confirmApp
    kafka = nock('https://api.data.heroku.com:443')

    cli.exit.mock()
    cli.confirmApp = confirmApp
    cli.mockConsole()
  })

  afterEach(() => {
    cli.confirmApp = confirm
    nock.cleanAll()
    kafka.done()
  })

  it('requires app confirmation', () => {
    const message = 'This command will affect the cluster: kafka-1, which is on myapp'

    kafka.delete(deleteUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

    lastApp = null
    lastConfirm = null
    lastMsg = null

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1' },
      flags: { confirm: 'myapp' }}
    )
      .then(() => {
        expect(lastApp).to.equal('myapp')
        expect(lastConfirm).to.equal('myapp')
        expect(lastMsg).to.equal(message)
      })
  })

  it('deletes the topic', () => {
    kafka.delete(deleteUrl('00000000-0000-0000-0000-000000000000', 'topic-1'), { topic_name: 'topic-1' })
      .reply(200)

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1' },
      flags: { 'replication-factor': '3', confirm: 'myapp' }}
    )
      .then(() => {
        expect(cli.stdout).to.equal('Your topic has been marked for deletion, and will be removed from the cluster shortly\n')
        expect(cli.stderr).to.equal('Deleting topic topic-1... done\n')
      })
  })
})
