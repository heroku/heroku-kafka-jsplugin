import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import nock from 'nock'
import {runCommand} from '../../../helpers/run-command.js'
import TopicsDestroy from '../../../../src/commands/kafka/topics/destroy.js'
import {hux} from '@heroku/heroku-cli-util'

const VERSION = 'v0'

describe('kafka:topics:destroy', () => {
  let kafka: nock.Scope
  let originalConfirmCommand: any

  const topicUrl = (cluster: string, topic: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/topics/${topic}`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
    originalConfirmCommand = hux.confirmCommand
    // Mock confirmCommand to automatically confirm
    hux.confirmCommand = async () => {}
  })

  afterEach(() => {
    hux.confirmCommand = originalConfirmCommand
    nock.cleanAll()
  })

  it('requires app confirmation', async () => {
    let confirmCommandCalled = false
    let comparison: string | undefined
    let confirmation: string | undefined
    let warningMessage: string | undefined

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
          plan: {name: 'heroku-kafka:basic-0'}
        },
        name: 'KAFKA'
      }])

    kafka.delete(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

    await runCommand(TopicsDestroy, ['topic-1', '--app', 'myapp', '--confirm', 'myapp'])

    expect(confirmCommandCalled).to.be.true
    expect(comparison).to.equal('myapp')
    expect(confirmation).to.equal('myapp')
    expect(warningMessage).to.equal('This command will affect the cluster: kafka-1, which is on myapp')
    api.done()
    kafka.done()
  })

  it('deletes the topic', async () => {
    const api = nock('https://api.heroku.com:443')
      .get('/apps/myapp/addon-attachments')
      .reply(200, [{
        addon: {
          id: '00000000-0000-0000-0000-000000000000',
          name: 'kafka-1',
          plan: {name: 'heroku-kafka:basic-0'}
        },
        name: 'KAFKA'
      }])

    kafka.delete(topicUrl('00000000-0000-0000-0000-000000000000', 'topic-1')).reply(200)

    const {stdout} = await runCommand(TopicsDestroy, ['topic-1', '--app', 'myapp', '--confirm', 'myapp'])
    expect(stdout).to.include('Your topic has been marked for deletion, and will be removed from the cluster shortly')
    api.done()
    kafka.done()
  })
})
