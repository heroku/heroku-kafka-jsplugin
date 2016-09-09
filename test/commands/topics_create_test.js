'use strict'

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

const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1' })
}

let lastApp
let lastConfirm
let lastMsg

const confirmApp = function * (app, confirm, msg) {
  lastApp = app
  lastConfirm = confirm
  lastMsg = msg
}

const cmd = proxyquire('../../commands/topics_create', {
  '../lib/clusters': {
    withCluster
  }
}).cmd

describe('kafka:topics:create', () => {
  let confirm
  let kafka

  let createUrl = (cluster) => {
    return `/client/kafka/v0/clusters/${cluster}/topics`
  }

  beforeEach(() => {
    confirm = cli.confirmApp
    kafka = nock('https://kafka-api.heroku.com:443')

    cli.exit.mock()
    cli.confirmApp = confirmApp
    cli.mockConsole()
  })

  afterEach(() => {
    cli.confirmApp = confirm
    nock.cleanAll()
    kafka.done()
  })

  it('shows an error and exits with an invalid retention time', () => {
    return expectExit(1, cmd.run({app: 'myapp',
                                  args: { TOPIC: 'topic-1' },
                                  flags: { 'retention-time': '2 eons' }}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(` ▸    Could not parse retention time '2 eons'; expected value like '36h' or\n ▸    '10d'\n`))
  })

  it('requires app confirmation and warns if replication factor of 1 specified', () => {
    const message = `This command will create a topic with no replication on the cluster: kafka-1, which is on myapp.\nData written to this topic will be lost if any single broker suffers catastrophic failure.`

    kafka.post(createUrl('kafka-1')).reply(200, { message: 'success' })

    lastApp = null
    lastConfirm = null
    lastMsg = null

    return cmd.run({app: 'myapp',
                    args: { TOPIC: 'topic-1' },
                    flags: { 'replication-factor': '1', confirm: 'myapp' }})
              .then(() => {
                expect(lastApp).to.equal('myapp')
                expect(lastConfirm).to.equal('myapp')
                expect(lastMsg).to.equal(message)
              })
              .then(() => {
                expect(cli.stderr).to.equal(' ▸    Proceeding to create a non-replicated topic...\nCreating topic topic-1... done\n')
              })
  })

  it('does not require app confirmation with higher replication factor', () => {
    kafka.post(createUrl('kafka-1')).reply(200)

    lastApp = null
    lastConfirm = null
    lastMsg = null

    return cmd.run({app: 'myapp',
                    args: { TOPIC: 'topic-1' },
                    flags: { 'replication-factor': '3', confirm: 'myapp' }})
              .then(() => {
                expect(lastApp).to.be.null
                expect(lastConfirm).to.be.null
                expect(lastMsg).to.be.null
              })
  })

  it('passes the topic name and specified flags', () => {
    kafka.post(createUrl('kafka-1'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 10,
          replication_factor: '3',
          partition_count: '7',
          compaction: false
        }
      }).reply(200)

    return cmd.run({app: 'myapp',
                    args: { TOPIC: 'topic-1' },
                    flags: { 'replication-factor': '3',
                             'retention-time': '10ms',
                             'partitions': '7' }})
              .then(() => {
                expect(cli.stderr).to.equal('Creating topic topic-1... done\n')
                expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
              })
  })

  it('defaults to 32 partitions', () => {
    kafka.post(createUrl('kafka-1'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 10,
          replication_factor: '3',
          partition_count: '32',
          compaction: false
        }
      }).reply(200)

    return cmd.run({app: 'myapp',
                    args: { TOPIC: 'topic-1' },
                    flags: { 'replication-factor': '3',
                             'retention-time': '10ms' }})
              .then(() => {
                expect(cli.stderr).to.equal('Creating topic topic-1... done\n')
                expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
              })
  })
})
