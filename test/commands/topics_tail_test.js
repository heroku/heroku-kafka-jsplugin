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
const EventEmitter = require('events')

let planName
const withCluster = function * (heroku, app, cluster, callback) {
  yield callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: { name: planName } })
}

let consumer

class FakeConsumer {
  constructor (opts) {
    consumer.opts = opts
  }

  init () {
    return consumer.init()
  }

  subscribe (topic, callback) {
    return consumer.subscribe(topic, callback)
  }
}

const tail = proxyquire('../../commands/topics_tail', {
  '../lib/clusters': {
    withCluster
  },
  'no-kafka': {
    SimpleConsumer: FakeConsumer
  }
})

const cmd = tail.cmd

describe('kafka:topics:tail', () => {
  let api
  let config = {
    KAFKA_URL: 'kafka+ssl://ec2-1-1-1-1.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-2.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-3.compute-1.amazonaws.com:9096',
    KAFKA_TRUSTED_CERT: 'hunter2',
    KAFKA_CLIENT_CERT: 'hunter3',
    KAFKA_CLIENT_CERT_KEY: 'hunter4'
  }

  beforeEach(() => {
    planName = 'heroku-kafka:beta-standard-2'
    consumer = {
      init: () => { return Promise.resolve() },
      subscribe: (topic, callback) => {}
    }

    api = nock('https://api.heroku.com:443')

    cli.mockConsole()
    tail.process = new EventEmitter()
  })

  afterEach(() => {
    nock.cleanAll()
    api.done()
    tail.process = global.process
  })

  it('warns and exits with an error if used with a Private Spaces cluster', () => {
    planName = 'heroku-kafka:beta-private-standard-2'
    return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }})
      .then(() => { throw new Error('expected error; got none') })
      .catch((err) => {
        expect(err.message).to.equal('`kafka:topics:tail` is not available in Heroku Private Spaces')
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
      })
  })

  it('warns and exits with an error if it cannot connect', () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })
    consumer.init = () => { throw new Error('oh snap') }

    return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }})
      .then(() => { throw new Error('expected error; got none') })
      .catch((err) => {
        expect(err.message).to.equal(`Could not connect to kafka`)
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
      })
  })

  it('warns and exits with an error if it cannot subscribe', () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })
    consumer.subscribe = () => { throw new Error('oh snap') }

    return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }})
      .then(() => { throw new Error('expected error; got none') })
      .catch((err) => {
        expect(err.message).to.equal('Could not subscribe to topic')
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
      })
  })

  it('tails a topic and prints the results', () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })

    consumer.subscribe = (topic, callback) => {
      callback([
        { offset: 1, message: { value: Buffer.from('hello') } },
        { offset: 2, message: { value: Buffer.from('world') } },
        { offset: 3, message: { value: null } }
      ], undefined, 42)
      tail.process.emit('SIGINT')
    }

    return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }})
      .then(() => {
        expect(cli.stdout).to.equal('topic-1 42 1 5 hello\ntopic-1 42 2 5 world\ntopic-1 42 3 0 NULL\n')
        expect(cli.stderr).to.be.empty
      })
  })

  it('tails a topic with a prefix and prints the results', () => {
    let configWithPrefix = Object.assign({
      KAFKA_PREFIX: 'nile-1234.'
    }, config)
    api.get('/apps/myapp/config-vars').reply(200, configWithPrefix)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })

    consumer.subscribe = (topic, callback) => {
      expect(topic).to.equal('nile-1234.topic-1')
      callback([
        { offset: 1, message: { value: Buffer.from('hello') } },
        { offset: 2, message: { value: Buffer.from('world') } },
        { offset: 3, message: { value: null } }
      ], undefined, 42)
      tail.process.emit('SIGINT')
    }

    return cmd.run({app: 'myapp', args: { TOPIC: 'topic-1' }})
      .then(() => {
        expect(cli.stdout).to.equal('topic-1 42 1 5 hello\ntopic-1 42 2 5 world\ntopic-1 42 3 0 NULL\n')
        expect(cli.stderr).to.be.empty
      })
  })

  it('tails a topic with a prefixed name and prints the results', () => {
    let configWithPrefix = Object.assign({
      KAFKA_PREFIX: 'nile-1234.'
    }, config)
    api.get('/apps/myapp/config-vars').reply(200, configWithPrefix)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, { name: 'KAFKA' })

    consumer.subscribe = (topic, callback) => {
      expect(topic).to.equal('nile-1234.topic-1')
      callback([
        { offset: 1, message: { value: Buffer.from('hello') } },
        { offset: 2, message: { value: Buffer.from('world') } },
        { offset: 3, message: { value: null } }
      ], undefined, 42)
      tail.process.emit('SIGINT')
    }

    return cmd.run({app: 'myapp', args: { TOPIC: 'nile-1234.topic-1' }})
      .then(() => {
        expect(cli.stdout).to.equal('nile-1234.topic-1 42 1 5 hello\nnile-1234.topic-1 42 2 5 world\nnile-1234.topic-1 42 3 0 NULL\n')
        expect(cli.stderr).to.be.empty
      })
  })
})
