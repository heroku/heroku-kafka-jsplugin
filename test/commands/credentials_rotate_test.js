'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.beforeEach
const proxyquire = require('proxyquire')

const cli = require('heroku-cli-util')
const nock = require('nock')

let planName
const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1', plan: { name: planName } })
}

const cmd = proxyquire('../../commands/credentials_rotate', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:credentials', () => {
  let kafka

  let credentialsUrl = (cluster) => {
    return `/client/kafka/v0/clusters/${cluster}/rotate-credentials`
  }

  beforeEach(() => {
    planName = 'heroku-kafka:beta-private-standard-2'
    kafka = nock('https://kafka-api.heroku.com:443')
    cli.mockConsole()
    cli.exit.mock()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it(`rotates credentials`, () => {
    kafka.post(credentialsUrl('kafka-1')).reply(200, {message: 'Rotated'})

    return cmd.run({app: 'myapp', args: {CLUSTER: undefined}, flags: { reset: true }})
      .then(() => expect(cli.stderr).to.be.empty)
  })
})
