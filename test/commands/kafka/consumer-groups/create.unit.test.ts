import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import ConsumerGroupsCreate from '../../../../src/commands/kafka/consumer-groups/create.js'
import {runCommand} from '../../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:consumer-groups:create', () => {
  let kafka: nock.Scope

  const consumerGroupsUrl = (cluster: string): string => `/data/kafka/${VERSION}/clusters/${cluster}/consumer_groups`

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
  })

  afterEach(() => {
    kafka.done()
  })

  it('creates a consumer group on the cluster', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
    }])

    kafka.post(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'))
    .reply(200)

    const {stdout} = await runCommand(ConsumerGroupsCreate, ['consumer-group-1', '--app', 'myapp'])
    expect(stdout).to.include('Use `heroku kafka:consumer-groups` to list your consumer groups.')
    api.done()
  })

  it('doesn\'t raise when the api 400s', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
    }])

    kafka.post(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'))
    .reply(400, {message: 'this command is not required or enabled on dedicated clusters'})

    const {stderr} = await runCommand(ConsumerGroupsCreate, ['consumer-group-1', '--app', 'myapp'])
    expect(stderr).to.include('kafka-1 does not need consumer groups managed explicitly')
    api.done()
  })
})
