'use strict'
/* eslint standard/no-callback-literal: off, no-unused-expressions: off */

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const proxyquire = require('proxyquire')
const nock = require('nock')

const cli = require('heroku-cli-util')

const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' })
}

let lastApp
let lastConfirm
let lastMsg

const confirmApp = function * (app, confirm, msg) {
  lastApp = app
  lastConfirm = confirm
  lastMsg = msg
}

const cmd = proxyquire('../../commands/upgrade', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:upgrade', () => {
  let confirm
  let kafka

  let upgradeUrl = (cluster) => {
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

    return cmd.run({app: 'myapp',
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

    return cmd.run({app: 'myapp',
      args: {},
      flags: {confirm: 'myapp', version: '0.10'}})
      .then(() => expect(cli.stderr).to.equal('Upgrading to version 0.10... started.\n\n\n'))
      .then(() => expect(cli.stdout).to.equal('Use `heroku kafka:wait` to monitor the upgrade.\n'))
  })
})
