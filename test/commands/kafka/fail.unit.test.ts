import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import nock from 'nock'
import {runCommand} from '../../helpers/run-command.js'
import Fail from '../../../src/commands/kafka/fail.js'
import {hux} from '@heroku/heroku-cli-util'

const VERSION = 'v0'

describe('kafka:fail', () => {
  let kafka: nock.Scope
  let originalConfirmCommand: any

  const failUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}/induce-failure`
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

    kafka.post(failUrl('00000000-0000-0000-0000-000000000000')).reply(200, {message: 'Triggered failure on node 1.2.3.4'})

    await runCommand(Fail, ['--app', 'myapp', '--confirm', 'myapp'])

    expect(confirmCommandCalled).to.be.true
    expect(comparison).to.equal('myapp')
    expect(confirmation).to.equal('myapp')
    expect(warningMessage).to.include('This command will affect the cluster: kafka-1')
    expect(warningMessage).to.include('This command will forcibly terminate nodes in your cluster at random')
    api.done()
  })

  it('triggers failure', async () => {
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

    kafka.post(failUrl('00000000-0000-0000-0000-000000000000')).reply(200, {message: 'Triggered failure on node 1.2.3.4'})

    const {stdout} = await runCommand(Fail, ['--app', 'myapp', '--confirm', 'myapp'])
    expect(stdout).to.include('Triggered failure on node 1.2.3.4')
    api.done()
    kafka.done()
  })

  it('passes the --catastrophic flag', async () => {
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

    kafka.post(failUrl('00000000-0000-0000-0000-000000000000')).reply(200, {message: 'Triggered failure on node 1.2.3.4'})

    const {stdout} = await runCommand(Fail, ['--app', 'myapp', '--confirm', 'myapp', '--catastrophic'])
    expect(stdout).to.include('Triggered failure on node 1.2.3.4')
    api.done()
    kafka.done()
  })

  it('passes the --zookeeper flag', async () => {
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

    kafka.post(failUrl('00000000-0000-0000-0000-000000000000')).reply(200, {message: 'Triggered failure on node 1.2.3.4'})

    const {stdout} = await runCommand(Fail, ['--app', 'myapp', '--confirm', 'myapp', '--zookeeper'])
    expect(stdout).to.include('Triggered failure on node 1.2.3.4')
    api.done()
    kafka.done()
  })
})
