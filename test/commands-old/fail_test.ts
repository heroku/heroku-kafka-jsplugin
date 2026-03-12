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

const cmd = await esmock('../../commands/fail.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})

describe('kafka:fail', () => {
  let confirm: any
  let kafka: nock.Scope

  const failUrl = (cluster: string): string => {
    return `/data/kafka/v0/clusters/${cluster}/induce-failure`
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
    const app = 'myapp'
    const cluster = 'kafka-1'
    const message = `This command will affect the cluster: ${cluster}, which is on ${app}\n\nThis command will forcibly terminate nodes in your cluster at random.\nYou should only run this command in controlled testing scenarios.`

    kafka.post(failUrl('00000000-0000-0000-0000-000000000000')).reply(200, { message: 'Triggered failure on node 1.2.3.4' })

    return cmd.default.run({app: 'myapp', args: {}, flags: {confirm: 'myapp'}})
      .then(() => {
        expect(lastApp).to.equal('myapp')
        expect(lastConfirm).to.equal('myapp')
        expect(lastMsg).to.equal(message)
      })
  })

  it('triggers failure', () => {
    kafka.post(failUrl('00000000-0000-0000-0000-000000000000', {confirm: 'myapp',
      catastrophic: false,
      zookeeper: false}))
      .reply(200, { message: 'Triggered failure on node 1.2.3.4' })

    return cmd.default.run({app: 'myapp',
      args: {},
      flags: {confirm: 'myapp',
        catastrophic: false,
        zookeeper: false}})
      .then(() => expect(cli.stderr).to.equal('Triggering failure... done\n'))
      .then(() => expect(cli.stdout).to.equal('Triggered failure on node 1.2.3.4\n'))
  })

  it('passes the --catastrophic flag', () => {
    kafka.post(failUrl('00000000-0000-0000-0000-000000000000', {confirm: 'myapp',
      catastrophic: true,
      zookeeper: false}))
      .reply(200, { message: 'Triggered failure on node 1.2.3.4' })

    return cmd.default.run({app: 'myapp',
      args: {},
      flags: {confirm: 'myapp',
        catastrophic: true,
        zookeeper: false}})
      .then(() => expect(cli.stderr).to.equal('Triggering failure... done\n'))
      .then(() => expect(cli.stdout).to.equal('Triggered failure on node 1.2.3.4\n'))
  })

  it('passes the --zookeeper flag', () => {
    kafka.post(failUrl('00000000-0000-0000-0000-000000000000', {confirm: 'myapp',
      catastrophic: false,
      zookeeper: true}))
      .reply(200, { message: 'Triggered failure on node 1.2.3.4' })

    return cmd.default.run({app: 'myapp',
      args: {},
      flags: {confirm: 'myapp',
        catastrophic: false,
        zookeeper: true}})
      .then(() => expect(cli.stderr).to.equal('Triggering failure... done\n'))
      .then(() => expect(cli.stdout).to.equal('Triggered failure on node 1.2.3.4\n'))
  })
})
