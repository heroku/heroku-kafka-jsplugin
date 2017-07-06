'use strict'
/* eslint standard/no-callback-literal: off, no-unused-expressions: off */

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

let lastApp
let lastConfirm
let lastMsg

const confirmApp = function * (app, confirm, msg) {
  lastApp = app
  lastConfirm = confirm
  lastMsg = msg
}

const VERSION = 'v0'

const cmd = proxyquire('../../commands/consumer_groups_destroy', {
  '../lib/clusters': {
    withCluster
  }
})

describe('kafka:consumer-groups:destroy', () => {
  let confirm
  let kafka

  let consumerGroupsUrl = (cluster) => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/consumer_groups`
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

  it('destroys a consumer group on the cluster', () => {
    kafka.delete(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'),
      {
        consumer_group: {
          name: 'consumer-group-1'
        }
      }
    ).reply(200)

    return cmd.run({app: 'myapp',
      args: { CONSUMER_GROUP: 'consumer-group-1' },
      flags: { confirm: 'myapp' }})
      .then(() => {
        expect(cli.stdout).to.equal('Your consumer group has been deleted\n')
      })
  })

  it('requires app confirmation', () => {
    const message = 'This command will affect the cluster: kafka-1, which is on myapp'

    kafka.delete(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'),
      {
        consumer_group: {
          name: 'consumer-group-1'
        }
      }
    ).reply(200)

    lastApp = null
    lastConfirm = null
    lastMsg = null

    return cmd.run({app: 'myapp',
      args: { CONSUMER_GROUP: 'consumer-group-1' },
      flags: { confirm: 'myapp' }})
              .then(() => {
                expect(lastApp).to.equal('myapp')
                expect(lastConfirm).to.equal('myapp')
                expect(lastMsg).to.equal(message)
              })
  })
})
