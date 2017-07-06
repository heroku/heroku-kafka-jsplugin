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

const cmd = proxyquire('../../commands/fail', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:fail', () => {
  let confirm
  let kafka

  let failUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}/induce-failure`
  }

  beforeEach(() => {
    confirm = cli.confirmApp
    kafka = nock('https://kafka-api.heroku.com:443')

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

    return cmd.run({app: 'myapp', args: {}, flags: {confirm: 'myapp'}})
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

    return cmd.run({app: 'myapp',
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

    return cmd.run({app: 'myapp',
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

    return cmd.run({app: 'myapp',
      args: {},
      flags: {confirm: 'myapp',
        catastrophic: false,
        zookeeper: true}})
      .then(() => expect(cli.stderr).to.equal('Triggering failure... done\n'))
      .then(() => expect(cli.stdout).to.equal('Triggered failure on node 1.2.3.4\n'))
  })
})
