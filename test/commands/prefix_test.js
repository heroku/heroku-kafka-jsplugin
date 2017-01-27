'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const proxyquire = require('proxyquire')

const cli = require('heroku-cli-util')
const nock = require('nock')

const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' })
}

const VERSION = 'v0'

const cmd = proxyquire('../../commands/prefix', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:prefix', () => {
  let kafka

  let consumerGroupsUrl = (cluster) => {
    return `/data/kafka/${VERSION}/clusters/${cluster}`
  }

  beforeEach(() => {
    kafka = nock('https://kafka-api.heroku.com:443')
    cli.mockConsole()
    cli.exit.mock()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('displays a prefix', () => {
    kafka.get(consumerGroupsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA',
      topic_prefix: 'nile-123.'
    })

    return cmd.run({app: 'myapp', args: {}})
      .then(() => expect(cli.stdout).to.equal(`nile-123.\n`))
  })
})
