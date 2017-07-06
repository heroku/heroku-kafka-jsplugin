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

let producer

class FakeProducer {
  constructor (opts) {
    producer.opts = opts
  }

  init () {
    return producer.init()
  }

  send (payload) {
    return producer.send(payload)
  }

  end () {
    return producer.end()
  }
}

const cmd = proxyquire('../../commands/topics_write', {
  '../lib/clusters': {
    withCluster
  },
  'no-kafka': {
    Producer: FakeProducer
  }
}).cmd

describe('kafka:topics:write', () => {
  let api
  let config = {
    KAFKA_URL: 'kafka+ssl://ec2-1-1-1-1.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-2.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-3.compute-1.amazonaws.com:9096',
    KAFKA_TRUSTED_CERT: 'hunter2',
    KAFKA_CLIENT_CERT: 'hunter3',
    KAFKA_CLIENT_CERT_KEY: 'hunter4'
  }

  beforeEach(() => {
    planName = 'heroku-kafka:beta-standard-2'
    producer = {
      init: () => { return Promise.resolve() },
      send: (payload) => { return Promise.resolve() },
      end: () => {}
    }

    api = nock('https://api.heroku.com:443')

    cli.exit.mock()
    cli.mockConsole()
  })

  afterEach(() => {
    nock.cleanAll()
    api.done()
  })

  it('warns and exits with an error if used with a Private Spaces cluster', () => {
    planName = 'heroku-kafka:beta-private-standard-2'
    return expectExit(1, cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(' ▸    `kafka:topics:write` is not available in Heroku Private Spaces\n'))
  })

  it('warns and exits with an error if it cannot connect', () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })
    producer.init = () => { throw new Error('oh snap') }

    return expectExit(1, cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(` ▸    Could not connect to kafka\n`))
  })

  it('warns and exits with an error if it cannot send the message', () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })
    producer.send = () => { throw new Error('oh snap') }

    return expectExit(1, cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }, flags: {}}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(` ▸    Could not write to topic\n`))
  })

  it('sends a message', () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })

    producer.send = (payload) => {
      expect(payload.topic).to.equal('topic-1')
      expect(payload.partition).to.equal(0)
      expect(payload.message).to.deep.equal({ value: 'hello world' })
      return Promise.resolve()
    }

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1', MESSAGE: 'hello world' },
      flags: {}}
    )
      .then(() => {
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
      })
  })

  it('uses a prefix if one exists', () => {
    var withPrefixConfig = {}
    Object.assign(withPrefixConfig, config)
    withPrefixConfig.KAFKA_PREFIX = 'nile-1234.'
    api.get('/apps/myapp/config-vars').reply(200, withPrefixConfig)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })

    producer.send = (payload) => {
      expect(payload.topic).to.equal('nile-1234.topic-1')
      expect(payload.partition).to.equal(0)
      expect(payload.message).to.deep.equal({ value: 'hello world' })
      return Promise.resolve()
    }

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1', MESSAGE: 'hello world' },
      flags: {}}
    )
      .then(() => {
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
      })
  })

  it('uses a prefixed topic if one is used', () => {
    var withPrefixConfig = {}
    Object.assign(withPrefixConfig, config)
    withPrefixConfig.KAFKA_PREFIX = 'nile-1234.'
    api.get('/apps/myapp/config-vars').reply(200, withPrefixConfig)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })

    producer.send = (payload) => {
      expect(payload.topic).to.equal('nile-1234.topic-1')
      expect(payload.partition).to.equal(0)
      expect(payload.message).to.deep.equal({ value: 'hello world' })
      return Promise.resolve()
    }

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'nile-1234.topic-1', MESSAGE: 'hello world' },
      flags: {}}
    )
      .then(() => {
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
      })
  })

  it('uses given partition if specified', () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })

    producer.send = (payload) => {
      expect(payload.topic).to.equal('topic-1')
      expect(payload.partition).to.equal(3)
      expect(payload.message).to.deep.equal({ value: 'hello world' })
      return Promise.resolve()
    }

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1', MESSAGE: 'hello world' },
      flags: { partition: '3' }}
    )
      .then(() => {
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
      })
  })

  it('uses given message key if specified', () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })

    producer.send = (payload) => {
      expect(payload.topic).to.equal('topic-1')
      expect(payload.partition).to.equal(0)
      expect(payload.message).to.deep.equal({ key: '1234', value: 'hello world' })
      return Promise.resolve()
    }

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1', MESSAGE: 'hello world' },
      flags: { 'key': '1234' }}
    )
      .then(() => {
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
      })
  })
})
