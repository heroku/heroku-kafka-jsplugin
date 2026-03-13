import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'
import sinon from 'sinon'

import TopicsWrite from '../../../../src/commands/kafka/topics/write.js'
import {kafkaClient} from '../../../../src/lib/kafka.js'
import {runCommand} from '../../../helpers/run-command.js'

describe('kafka:topics:write', () => {
  let kafka: nock.Scope
  let api: nock.Scope
  let sandbox: sinon.SinonSandbox
  let producer: any
  let createProducerStub: sinon.SinonStub

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
    api = nock('https://api.heroku.com:443')
    sandbox = sinon.createSandbox()

    // Create a mock producer
    producer = {
      end: sandbox.stub(),
      init: sandbox.stub().resolves(),
      send: sandbox.stub().resolves(),
    }

    // Stub kafkaClient.createProducer to return our mock producer
    createProducerStub = sandbox.stub(kafkaClient, 'createProducer').resolves(producer)
  })

  afterEach(() => {
    nock.cleanAll()
    sandbox.restore()
  })

  it('requires an app flag', async () => {
    const {error} = await runCommand(TopicsWrite, ['my-topic', 'my-message'])
    expect(error?.message).to.include('Missing required flag app')
  })

  it('requires a topic argument', async () => {
    const {error} = await runCommand(TopicsWrite, ['--app', 'myapp'])
    expect(error?.message).to.include('Missing 2 required args')
    expect(error?.message).to.include('topic')
    expect(error?.message).to.include('message')
  })

  it('requires a message argument', async () => {
    const {error} = await runCommand(TopicsWrite, ['my-topic', '--app', 'myapp'])
    expect(error?.message).to.include('Missing 1 required arg')
  })

  it('sends a message to a topic', async () => {
    api.get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
      name: 'KAFKA',
    }])
    api.get('/apps/myapp/addon-attachments/kafka-1')
    .reply(200, {
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
      name: 'KAFKA',
    })
    api.get('/apps/myapp/config-vars')
    .reply(200, {
      KAFKA_CLIENT_CERT: 'client-cert',
      KAFKA_CLIENT_CERT_KEY: 'client-key',
      KAFKA_TRUSTED_CERT: 'cert',
      KAFKA_URL: 'kafka+ssl://broker:9096',
    })

    await runCommand(TopicsWrite, ['my-topic', 'hello world', '--app', 'myapp'])

    // Verify producer was called
    expect(producer.init.calledOnce).to.be.true
    expect(producer.send.calledOnce).to.be.true
    expect(producer.send.firstCall.args[0]).to.have.property('topic', 'my-topic')
    expect(producer.send.firstCall.args[0]).to.have.property('partition', 0)
    expect(producer.send.firstCall.args[0].message).to.deep.equal({value: 'hello world'})
    expect(producer.end.calledOnce).to.be.true
  })

  it('handles connection errors', async () => {
    // Override the init stub to reject
    producer.init.rejects(new Error('connection failed'))

    api.get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
      name: 'KAFKA',
    }])
    api.get('/apps/myapp/addon-attachments/kafka-1')
    .reply(200, {
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
      name: 'KAFKA',
    })
    api.get('/apps/myapp/config-vars')
    .reply(200, {
      KAFKA_CLIENT_CERT: 'client-cert',
      KAFKA_CLIENT_CERT_KEY: 'client-key',
      KAFKA_TRUSTED_CERT: 'cert',
      KAFKA_URL: 'kafka+ssl://broker:9096',
    })

    const {error} = await runCommand(TopicsWrite, ['my-topic', 'hello world', '--app', 'myapp'])
    expect(error?.message).to.include('Could not connect to kafka')
  })

  it('handles send errors', async () => {
    // Override the send stub to reject
    producer.send.rejects(new Error('send failed'))

    api.get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
      name: 'KAFKA',
    }])
    api.get('/apps/myapp/addon-attachments/kafka-1')
    .reply(200, {
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      config_vars: ['KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY'],
      name: 'KAFKA',
    })
    api.get('/apps/myapp/config-vars')
    .reply(200, {
      KAFKA_CLIENT_CERT: 'client-cert',
      KAFKA_CLIENT_CERT_KEY: 'client-key',
      KAFKA_TRUSTED_CERT: 'cert',
      KAFKA_URL: 'kafka+ssl://broker:9096',
    })

    const {error} = await runCommand(TopicsWrite, ['my-topic', 'hello world', '--app', 'myapp'])
    expect(error?.message).to.include('Could not write to topic')
  })
})
