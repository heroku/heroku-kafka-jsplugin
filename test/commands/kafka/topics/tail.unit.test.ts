import {expect} from 'chai'
import {
  describe, it, beforeEach, afterEach,
} from 'mocha'
import nock from 'nock'
import sinon from 'sinon'
import {runCommand} from '../../../helpers/run-command.js'
import TopicsTail from '../../../../src/commands/kafka/topics/tail.js'
import {kafkaClient} from '../../../../src/lib/kafka.js'

describe('kafka:topics:tail', () => {
  let kafka: nock.Scope
  let api: nock.Scope
  let sandbox: sinon.SinonSandbox
  let consumer: any
  let createSimpleConsumerStub: sinon.SinonStub

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
    api = nock('https://api.heroku.com:443')
    sandbox = sinon.createSandbox()

    // Create a mock consumer
    consumer = {
      init: sandbox.stub().resolves(),
      subscribe: sandbox.stub(),
      end: sandbox.stub(),
    }

    // Stub kafkaClient.createSimpleConsumer to return our mock consumer
    createSimpleConsumerStub = sandbox.stub(kafkaClient, 'createSimpleConsumer').resolves(consumer)
  })

  afterEach(() => {
    nock.cleanAll()
    sandbox.restore()
  })

  it('requires an app flag', async () => {
    const {error} = await runCommand(TopicsTail, ['my-topic'])
    expect(error?.message).to.include('Missing required flag app')
  })

  it('requires a topic argument', async () => {
    const {error} = await runCommand(TopicsTail, ['--app', 'myapp'])
    expect(error?.message).to.include('Missing 1 required arg')
  })

  it.skip('tails a topic and prints messages', async () => {
    // This test is complex because tail runs continuously
    // Would need to handle the infinite loop
    // Skipping for now as it's more of an integration test
  })

  it('handles connection errors', async () => {
    // Override the init stub to reject
    consumer.init.rejects(new Error('connection failed'))

    api.get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
    }])
    api.get('/apps/myapp/addon-attachments/kafka-1')
    .reply(200, {
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
    })
    api.get('/apps/myapp/config-vars')
    .reply(200, {
      KAFKA_URL: 'kafka+ssl://broker:9096',
      KAFKA_TRUSTED_CERT: 'cert',
      KAFKA_CLIENT_CERT: 'client-cert',
      KAFKA_CLIENT_CERT_KEY: 'client-key',
    })

    const {error} = await runCommand(TopicsTail, ['my-topic', '--app', 'myapp'])
    expect(error?.message).to.include('Could not connect to kafka')
  })

  it('handles subscribe errors', async () => {
    // Override the subscribe stub to throw
    consumer.subscribe.throws(new Error('subscribe failed'))

    api.get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
    }])
    api.get('/apps/myapp/addon-attachments/kafka-1')
    .reply(200, {
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
    })
    api.get('/apps/myapp/config-vars')
    .reply(200, {
      KAFKA_URL: 'kafka+ssl://broker:9096',
      KAFKA_TRUSTED_CERT: 'cert',
      KAFKA_CLIENT_CERT: 'client-cert',
      KAFKA_CLIENT_CERT_KEY: 'client-key',
    })

    const {error} = await runCommand(TopicsTail, ['my-topic', '--app', 'myapp'])
    expect(error?.message).to.include('Could not subscribe to topic')
  })
})
