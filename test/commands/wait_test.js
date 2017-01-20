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

const all = [
  {name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: {name: 'heroku-kafka:beta-3'}},
  {name: 'kafka-2', id: '00000000-0000-0000-0000-000000000001', plan: {name: 'heroku-kafka:beta-3'}}
]

const fetcher = () => {
  return {
    all: () => all,
    addon: () => all[0]
  }
}

const cmd = proxyquire('../../commands/wait', {
  '../lib/fetcher': fetcher
})

describe('kafka:wait', () => {
  let kafka
  let waitUrl = (cluster) => {
    return `/data/kafka/v0/clusters/${cluster}/wait_status`
  }

  beforeEach(() => {
    cli.mockConsole()
    cli.exit.mock()
    kafka = nock('https://kafka-api.heroku.com')
  })

  afterEach(() => {
    kafka.done()
    nock.cleanAll()
  })

  it('waits for a cluster to be available', () => {
    kafka
      .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'waiting?': true, message: 'pending'})
      .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'waiting?': false, message: 'available'})

    return cmd.run({app: 'myapp', args: {cluster: 'KAFKA_URL'}, flags: {'wait-interval': '1'}})
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(`Waiting for cluster kafka-1... pending
Waiting for cluster kafka-1... available
`))
  })

  it('waits for all clusters to be available', () => {
    kafka
      .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'waiting?': false})
      .get(waitUrl('00000000-0000-0000-0000-000000000001')).reply(200, {'waiting?': false})

    return cmd.run({app: 'myapp', args: {}, flags: {}})
      .then(() => expect(cli.stdout, 'to equal', ''))
      .then(() => expect(cli.stderr, 'to equal', ''))
  })

  it('displays errors', () => {
    kafka
      .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'error?': true, message: 'this is an error message'})

    return cmd.run({app: 'myapp', args: {}, flags: {}})
      .catch(err => {
        if (err.code !== 1) throw err
        expect(cli.stdout, 'to equal', '')
        expect(cli.stderr, 'to equal', ' ▸    this is an error message\n')
      })
  })
})
