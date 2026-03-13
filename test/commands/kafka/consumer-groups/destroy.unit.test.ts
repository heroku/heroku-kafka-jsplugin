import {hux} from '@heroku/heroku-cli-util'
import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import ConsumerGroupsDestroy from '../../../../src/commands/kafka/consumer-groups/destroy.js'
import {runCommand} from '../../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:consumer-groups:destroy', () => {
  let kafka: nock.Scope
  let originalConfirmCommand: any

  const consumerGroupsUrl = (cluster: string): string => `/data/kafka/${VERSION}/clusters/${cluster}/consumer_groups`

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
    originalConfirmCommand = hux.confirmCommand
    // Mock confirmCommand to automatically confirm
    hux.confirmCommand = async () => {}
  })

  afterEach(() => {
    hux.confirmCommand = originalConfirmCommand
    nock.cleanAll()
    kafka.done()
  })

  it('destroys a consumer group on the cluster', async () => {
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

    kafka.delete(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'), {
      consumer_group: {
        name: 'consumer-group-1',
      },
    }).reply(200)

    const {stdout} = await runCommand(ConsumerGroupsDestroy, ['consumer-group-1', '--app', 'myapp', '--confirm', 'myapp'])
    expect(stdout).to.include('Your consumer group has been deleted')
    api.done()
  })

  it('requires app confirmation', async () => {
    let confirmCommandCalled = false
    let comparison: string | null = null
    let confirmation: string | undefined = null
    let warningMessage: string | null = null

    hux.confirmCommand = async (options: any) => {
      confirmCommandCalled = true
      comparison = options.comparison
      confirmation = options.confirmation
      warningMessage = options.warningMessage
    }

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

    kafka.delete(consumerGroupsUrl('00000000-0000-0000-0000-000000000000'), {
      consumer_group: {
        name: 'consumer-group-1',
      },
    }).reply(200)

    await runCommand(ConsumerGroupsDestroy, ['consumer-group-1', '--app', 'myapp', '--confirm', 'myapp'])

    expect(confirmCommandCalled).to.be.true
    expect(comparison).to.equal('myapp')
    expect(confirmation).to.equal('myapp')
    expect(warningMessage).to.equal('This command will affect the cluster: kafka-1, which is on myapp')
    api.done()
  })
})
