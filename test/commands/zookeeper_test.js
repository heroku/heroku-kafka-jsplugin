'use strict'
/* eslint standard/no-callback-literal: off, no-unused-expressions: off */

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const proxyquire = require('proxyquire')
const expectExit = require('../expect_exit')

const cli = require('heroku-cli-util')
const nock = require('nock')

let planName
const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: { name: planName } })
}

const cmd = proxyquire('../../commands/zookeeper', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:zookeeper', () => {
  let kafka

  let configUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}/zookeeper`
  }

  beforeEach(() => {
    planName = 'heroku-kafka:private-standard-2'
    kafka = nock('https://api.data.heroku.com:443')
    cli.mockConsole()
    cli.exit.mock()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('warns and exits with an error if used with a non-Private Spaces cluster', () => {
    planName = 'heroku-kafka:standard-2'
    return expectExit(1, cmd.run({app: 'myapp', args: { VALUE: 'enable' }}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(' ▸    `kafka:zookeeper` is only available in Heroku Private Spaces\n'))
  })

  describe('with unknown value specified', () => {
    it('shows an error and exits', () => {
      return expectExit(1, cmd.run({app: 'myapp', args: { VALUE: 'yep' }}))
        .then(() => expect(cli.stdout).to.be.empty)
        .then(() => expect(cli.stderr).to.equal(` ▸    Unknown value 'yep': must be 'on' or 'enable' to enable, or 'off' or
 ▸    'disable' to disable
`))
    })
  })

  const validEnable = [ 'enable', 'on' ]
  validEnable.forEach((value) => {
    it(`turns zookeeper on with argument ${value}`, () => {
      kafka.post(configUrl('00000000-0000-0000-0000-000000000000'), { enabled: true }).reply(200)

      return cmd.run({app: 'myapp', args: { VALUE: value }})
        .then(() => expect(cli.stderr).to.equal('Enabling Zookeeper access... done\n'))
        .then(() => expect(cli.stdout).to.be.empty)
    })
  })

  const validDisable = [ 'disable', 'off' ]
  validDisable.forEach((value) => {
    it(`turns zookeeper off with argument ${value}`, () => {
      kafka.post(configUrl('00000000-0000-0000-0000-000000000000'), { enabled: false }).reply(200)

      return cmd.run({app: 'myapp', args: { VALUE: value }})
        .then(() => expect(cli.stderr).to.equal('Disabling Zookeeper access... done\n'))
        .then(() => expect(cli.stdout).to.be.empty)
    })
  })
})
