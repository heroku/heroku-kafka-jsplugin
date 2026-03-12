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

let consumer: any

const createSimpleConsumer = async (opts: any) => {
  consumer.opts = opts
  return consumer
}

const TopicsTail = (await esmock('../../../../src/commands/kafka/topics/tail.js', {
  '../../../../src/lib/clusters.js': {
    withCluster
  },
  '../../../../src/lib/kafka.js': {
    createSimpleConsumer
  }
})).default

describe('kafka:topics:tail', () => {
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
    consumer = {
      init: () => {
        return Promise.resolve()
      },
      subscribe: (topic: string, callback: any) => {}
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
    consumer.init = () => {
      throw new Error('oh snap')
    }

    const {error} = await runEsmockedCommand(TopicsTail, {app: 'myapp', args: {TOPIC: 'topic-1'}, flags: {}})
    expect(error?.message).to.include('Could not connect to kafka')
  })

  it.skip('warns and exits with an error if it cannot subscribe', async () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars, app: {name: 'sushi'}})
    consumer.subscribe = () => {
      throw new Error('oh snap')
    }

    const {error} = await runEsmockedCommand(TopicsTail, {app: 'myapp', args: {TOPIC: 'topic-1'}, flags: {}})
    expect(error?.message).to.include('Could not subscribe to topic')
  })

  it.skip('tails a topic and prints the results', async () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars, app: {name: 'sushi'}})

    consumer.subscribe = (topic: string, callback: any) => {
      callback([
        {offset: 1, message: {value: Buffer.from('hello')}},
        {offset: 2, message: {value: Buffer.from('world')}},
        {offset: 3, message: {value: null}}
      ], undefined, 42)
      process.emit('SIGINT' as any)
    }

    const {stdout} = await runEsmockedCommand(TopicsTail, {app: 'myapp', args: {TOPIC: 'topic-1'}, flags: {}})
    expect(stdout).to.equal('topic-1 42 1 5 hello\ntopic-1 42 2 5 world\ntopic-1 42 3 0 NULL\n')
  })

  it.skip('tails a topic and prints the results limited by max-length flag', async () => {
    api.get('/apps/myapp/config-vars').reply(200, config)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars, app: {name: 'sushi'}})

    consumer.subscribe = (topic: string, callback: any) => {
      callback([
        {offset: 1, message: {value: Buffer.from('hello, this is a slightly longer message that shows an output just a litte bit longer than 80')}},
        {offset: 2, message: {value: Buffer.from('Hodor. Hodor hodor... Hodor hodor hodor hodor. Hodor, hodor. Hodor. Hodor, hodor, hodor. Hodor hodor?! Hodor, hodor.')}},
        {offset: 3, message: {value: Buffer.from('world')}},
        {offset: 4, message: {value: null}}
      ], undefined, 42)
      process.emit('SIGINT' as any)
    }

    const {stdout} = await runEsmockedCommand(TopicsTail, {app: 'myapp', args: {TOPIC: 'topic-1'}, flags: {'max-length': '100'}})
    expect(stdout).to.equal('topic-1 42 1 93 hello, this is a slightly longer message that shows an output just a litte bit longer than 80\n' +
                            'topic-1 42 2 116 Hodor. Hodor hodor... Hodor hodor hodor hodor. Hodor, hodor. Hodor. Hodor, hodor, hodor. Hodor hodor\n' +
                            'topic-1 42 3 5 world\n' +
                            'topic-1 42 4 0 NULL\n')
  })

  it.skip('tails a topic with a prefix and prints the results', async () => {
    const configWithPrefix = {...config, KAFKA_PREFIX: 'nile-1234.'}
    api.get('/apps/myapp/config-vars').reply(200, configWithPrefix)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars.concat('KAFKA_PREFIX'), app: {name: 'sushi'}})

    consumer.subscribe = (topic: string, callback: any) => {
      expect(topic).to.equal('nile-1234.topic-1')
      callback([
        {offset: 1, message: {value: Buffer.from('hello')}},
        {offset: 2, message: {value: Buffer.from('world')}},
        {offset: 3, message: {value: null}}
      ], undefined, 42)
      process.emit('SIGINT' as any)
    }

    const {stdout} = await runEsmockedCommand(TopicsTail, {app: 'myapp', args: {TOPIC: 'topic-1'}, flags: {}})
    expect(stdout).to.equal('topic-1 42 1 5 hello\ntopic-1 42 2 5 world\ntopic-1 42 3 0 NULL\n')
  })

  it.skip('tails a topic with a prefixed name and prints the results', async () => {
    const configWithPrefix = {...config, KAFKA_PREFIX: 'nile-1234.'}
    api.get('/apps/myapp/config-vars').reply(200, configWithPrefix)
    api.get('/apps/myapp/addon-attachments/kafka-1')
      .reply(200, {name: 'KAFKA', config_vars: stockConfigVars.concat('KAFKA_PREFIX'), app: {name: 'sushi'}})

    consumer.subscribe = (topic: string, callback: any) => {
      expect(topic).to.equal('nile-1234.topic-1')
      callback([
        {offset: 1, message: {value: Buffer.from('hello')}},
        {offset: 2, message: {value: Buffer.from('world')}},
        {offset: 3, message: {value: null}}
      ], undefined, 42)
      process.emit('SIGINT' as any)
    }

    const {stdout} = await runEsmockedCommand(TopicsTail, {app: 'myapp', args: {TOPIC: 'nile-1234.topic-1'}, flags: {}})
    expect(stdout).to.equal('nile-1234.topic-1 42 1 5 hello\nnile-1234.topic-1 42 2 5 world\nnile-1234.topic-1 42 3 0 NULL\n')
  })
})
