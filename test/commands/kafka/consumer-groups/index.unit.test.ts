import {expect} from 'chai'
import {
  describe, it, beforeEach, afterEach,
} from 'mocha'
import nock from 'nock'
import {runCommand} from '../../../helpers/run-command.js'
import ConsumerGroups from '../../../../src/commands/kafka/consumer-groups/index.js'

const VERSION = 'v0'

describe('kafka:consumer-groups', () => {
  let kafka: nock.Scope

  const consumerGroupsUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/consumer_groups`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('displays a list of consumer groups', async () => {
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

    kafka.get(consumerGroupsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA',
      consumer_groups: [
        {name: 'consumer-group-1'},
        {name: 'consumer-group-2'},
      ],
    })

    const {stdout} = await runCommand(ConsumerGroups, ['--app', 'myapp'])
    expect(stdout).to.include('=== Kafka Consumer Groups on HEROKU_KAFKA')
    expect(stdout).to.include('Name')
    expect(stdout).to.include('consumer-group-1')
    expect(stdout).to.include('consumer-group-2')
    api.done()
  })

  it('displays message when no consumer groups exist', async () => {
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

    kafka.get(consumerGroupsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {
      attachment_name: 'HEROKU_KAFKA',
      consumer_groups: [],
    })

    const {stdout} = await runCommand(ConsumerGroups, ['--app', 'myapp'])
    expect(stdout).to.include('No consumer groups found on this Kafka cluster.')
    expect(stdout).to.include('Use heroku kafka:consumer-groups:create to create a consumer group.')
    api.done()
  })
})
