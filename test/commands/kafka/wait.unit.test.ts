import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import Wait from '../../../src/commands/kafka/wait.js'
import {runCommand} from '../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:wait', () => {
  let kafka: nock.Scope

  const waitUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/wait_status`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it.skip('waits for a cluster to be available', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      config_vars: ['KAFKA_URL'],
      name: 'KAFKA',
    }])
    .post('/actions/addon-attachments/resolve')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      app: {name: 'myapp'},
      name: 'KAFKA',
    }])

    kafka
    .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {message: 'pending', 'waiting?': true})
    .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {message: 'available', 'waiting?': false})

    const {stderr} = await runCommand(Wait, ['KAFKA_URL', '--app', 'myapp', '--wait-interval', '0.1'])
    expect(stderr).to.include('Waiting for cluster kafka-1')
    expect(stderr).to.include('pending')
    expect(stderr).to.include('available')
    api.done()
    kafka.done()
  })

  it.skip('waits for all clusters to be available', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [
      {
        addon: {
          addon_service: {name: 'heroku-kafka'},
          id: '00000000-0000-0000-0000-000000000000',
          name: 'kafka-1',
          plan: {name: 'heroku-kafka:basic-0'},
        },
        name: 'KAFKA',
      },
      {
        addon: {
          addon_service: {name: 'heroku-kafka'},
          id: '00000000-0000-0000-0000-000000000001',
          name: 'kafka-2',
          plan: {name: 'heroku-kafka:basic-0'},
        },
        name: 'KAFKA_2',
      },
    ])

    kafka
    .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'waiting?': false})
    .get(waitUrl('00000000-0000-0000-0000-000000000001')).reply(200, {'waiting?': false})

    const {stderr} = await runCommand(Wait, ['--app', 'myapp'])
    expect(stderr).to.equal('')
    api.done()
    kafka.done()
  })

  it.skip('displays errors', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        addon_service: {name: 'heroku-kafka'},
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
    }])

    kafka
    .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'error?': true, message: 'this is an error message'})

    const {error} = await runCommand(Wait, ['--app', 'myapp'])
    expect(error?.message).to.include('this is an error message')
    api.done()
    kafka.done()
  })
})
