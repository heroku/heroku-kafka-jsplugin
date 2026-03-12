import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'




import esmock from 'esmock'
import nock from 'nock'
import { Addon } from '../../lib/shared.js'

import cli from '@heroku/heroku-cli-util'

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

const cmd = await esmock('../../commands/upgrade.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})

describe('kafka:upgrade', () => {
  let confirm
  let kafka: nock.Scope

  const upgradeUrl = (cluster: string):string => {
    return `/data/kafka/v0/clusters/${cluster}/upgrade`
  }

  beforeEach(() => {
    confirm = cli.confirmApp
    kafka = nock('https://api.data.heroku.com:443')

    cli.confirmApp = confirmApp
    cli.mockConsole()
  })

  afterEach(() => {
    cli.confirmApp = confirm
  })

  it('requires app confirmation', () => {
    const message = `This command will upgrade the brokers of the cluster to version 0.10.
                          Upgrading the cluster involves rolling restarts of brokers, and takes some time, depending on the
                          size of the cluster.`

    kafka.put(upgradeUrl('00000000-0000-0000-0000-000000000000')).reply(200)

    return cmd.default.run({app: 'myapp',
      args: {},
      flags: {confirm: 'myapp', version: '0.10'}})
      .then(() => {
        expect(lastApp).to.equal('myapp')
        expect(lastConfirm).to.equal('myapp')
        expect(lastMsg).to.equal(message)
      })
  })

  it('triggers an upgrade to the desired version', () => {
    kafka.put(upgradeUrl('00000000-0000-0000-0000-000000000000', {confirm: 'myapp',
      version: '0.10'})
    )
      .reply(200, { message: 'Triggered failure on node 1.2.3.4' })

    return cmd.default.run({app: 'myapp',
      args: {},
      flags: {confirm: 'myapp', version: '0.10'}})
      .then(() => expect(cli.stderr).to.equal('Upgrading to version 0.10... started.\n\n\n'))
      .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:wait` to monitor the upgrade.\n'))
  })
})
