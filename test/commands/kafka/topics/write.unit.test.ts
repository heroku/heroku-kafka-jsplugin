import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import esmock from 'esmock'
import nock from 'nock'
import {Addon} from '../../../../src/lib/shared.js'
import {runEsmockedCommand} from '../../../helpers/run-esmocked-command.js'

let planName: string
const withCluster = async (
  heroku: any,
  app: string,
  cluster: string | undefined,
  callback: (addon: Addon) => Promise<void>
) => {
  await callback({name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: {name: planName}})
}

let producer: any

const createProducer = async (opts: any) => {
  producer.opts = opts
  return producer
}

const TopicsWrite = (await esmock('../../../../src/commands/kafka/topics/write.js', {
  '../../../../src/lib/clusters.js': {
    withCluster
  },
  '../../../../src/lib/kafka.js': {
    createProducer
  }
})).default

describe('kafka:topics:write', () => {
  let api: nock.Scope
  const config = {
    KAFKA_URL: 'kafka+ssl://ec2-1-1-1-1.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-2.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-3.compute-1.amazonaws.com:9096',
    KAFKA_TRUSTED_CERT: 'hunter2',
    KAFKA_CLIENT_CERT: 'hunter3',
    KAFKA_CLIENT_CERT_KEY: 'hunter4'
  }
  const stockConfigVars = Object.keys(config)

  beforeEach(() => {
    planName = 'heroku-kafka:beta-standard-2'
    producer = {
      init: () => {
        return Promise.resolve()
      },
      send: (payload: any) => {
        return Promise.resolve()
      },
      end: () => {}
    }

    api = nock('https://api.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
    api.done()
  })

  it.skip('warns and exits with an error if it cannot connect', async () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars, app: {name: 'sushi'}})
    producer.init = () => {
      throw new Error('oh snap')
    }

    const {error} = await runEsmockedCommand(TopicsWrite, {app: 'myapp', args: {TOPIC: 'topic-1', MESSAGE: 'hello'}, flags: {}})
    expect(error?.message).to.include('Could not connect to kafka')
  })

  it.skip('warns and exits with an error if it cannot send the message', async () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars, app: {name: 'sushi'}})
    producer.send = () => {
      throw new Error('oh snap')
    }

    const {error} = await runEsmockedCommand(TopicsWrite, {app: 'myapp', args: {TOPIC: 'topic-1', MESSAGE: 'hello'}, flags: {}})
    expect(error?.message).to.include('Could not write to topic')
  })

  it('sends a message', async () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars, app: {name: 'sushi'}})

    producer.send = (payload: any) => {
      expect(payload.topic).to.equal('topic-1')
      expect(payload.partition).to.equal(0)
      expect(payload.message).to.deep.equal({value: 'hello world'})
      return Promise.resolve()
    }

    await runEsmockedCommand(TopicsWrite, {app: 'myapp', args: {TOPIC: 'topic-1', MESSAGE: 'hello world'}, flags: {}})
  })

  it('uses a prefix if one exists', async () => {
    const withPrefixConfig = {...config, KAFKA_PREFIX: 'nile-1234.'}
    api.get('/apps/myapp/config-vars').reply(200, withPrefixConfig)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars.concat('KAFKA_PREFIX'), app: {name: 'sushi'}})

    producer.send = (payload: any) => {
      expect(payload.topic).to.equal('nile-1234.topic-1')
      expect(payload.partition).to.equal(0)
      expect(payload.message).to.deep.equal({value: 'hello world'})
      return Promise.resolve()
    }

    await runEsmockedCommand(TopicsWrite, {app: 'myapp', args: {TOPIC: 'topic-1', MESSAGE: 'hello world'}, flags: {}})
  })

  it('uses a prefixed topic if one is used', async () => {
    const withPrefixConfig = {...config, KAFKA_PREFIX: 'nile-1234.'}
    api.get('/apps/myapp/config-vars').reply(200, withPrefixConfig)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars.concat('KAFKA_PREFIX'), app: {name: 'sushi'}})

    producer.send = (payload: any) => {
      expect(payload.topic).to.equal('nile-1234.topic-1')
      expect(payload.partition).to.equal(0)
      expect(payload.message).to.deep.equal({value: 'hello world'})
      return Promise.resolve()
    }

    await runEsmockedCommand(TopicsWrite, {app: 'myapp', args: {TOPIC: 'nile-1234.topic-1', MESSAGE: 'hello world'}, flags: {}})
  })

  it('uses given partition if specified', async () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars, app: {name: 'sushi'}})

    producer.send = (payload: any) => {
      expect(payload.topic).to.equal('topic-1')
      expect(payload.partition).to.equal(3)
      expect(payload.message).to.deep.equal({value: 'hello world'})
      return Promise.resolve()
    }

    await runEsmockedCommand(TopicsWrite, {app: 'myapp', args: {TOPIC: 'topic-1', MESSAGE: 'hello world'}, flags: {partition: '3'}})
  })

  it('uses given message key if specified', async () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars, app: {name: 'sushi'}})

    producer.send = (payload: any) => {
      expect(payload.topic).to.equal('topic-1')
      expect(payload.partition).to.equal(0)
      expect(payload.message).to.deep.equal({key: '1234', value: 'hello world'})
      return Promise.resolve()
    }

    await runEsmockedCommand(TopicsWrite, {app: 'myapp', args: {TOPIC: 'topic-1', MESSAGE: 'hello world'}, flags: {key: '1234'}})
  })
})
