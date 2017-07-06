'use strict'
/* eslint no-unused-expressions: off */

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.afterEach
const proxyquire = require('proxyquire')

const cli = require('heroku-cli-util')
const nock = require('nock')

const withCluster = async function (heroku, app, cluster) {
  return { name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000' }
}

let lastApp
let lastConfirm
let lastMsg

const confirmApp = function * (app, confirm, msg) {
  lastApp = app
  lastConfirm = confirm
  lastMsg = msg
}

const cmd = proxyquire('../../commands/topics_destroy', {
  '../lib/clusters': {
    withCluster
  }
}).cmd

describe('kafka:topics:destroy', () => {
  let confirm
  let kafka

  let deleteUrl = (cluster, topic) => {
    return `/data/kafka/v0/clusters/${cluster}/topics/${topic}`
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
