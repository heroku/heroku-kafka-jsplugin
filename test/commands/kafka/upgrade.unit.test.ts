import {hux} from '@heroku/heroku-cli-util'
import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import Upgrade from '../../../src/commands/kafka/upgrade.js'
import {runCommand} from '../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:upgrade', () => {
  let kafka: nock.Scope
  let originalConfirmCommand: any

  const upgradeUrl = (cluster: string): string => `/data/kafka/${VERSION}/clusters/${cluster}/upgrade`

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
        plan: {name: 'heroku-kafka:basic-0'},
      },
      name: 'KAFKA',
    }])

    kafka.put(upgradeUrl('00000000-0000-0000-0000-000000000000')).reply(200)

    await runCommand(Upgrade, ['--app', 'myapp', '--confirm', 'myapp', '--version', '0.10'])

    expect(confirmCommandCalled).to.be.true
    expect(comparison).to.equal('myapp')
    expect(confirmation).to.equal('myapp')
    expect(warningMessage).to.include('This command will upgrade the brokers of the cluster to version 0.10')
    expect(warningMessage).to.include('Upgrading the cluster involves rolling restarts of brokers')
    api.done()
    kafka.done()
  })

  it('triggers an upgrade to the desired version', async () => {
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

    kafka.put(upgradeUrl('00000000-0000-0000-0000-000000000000')).reply(200)

    const {stdout} = await runCommand(Upgrade, ['--app', 'myapp', '--confirm', 'myapp', '--version', '0.10'])
    expect(stdout).to.include('Use `heroku kafka:wait` to monitor the upgrade.')
    api.done()
    kafka.done()
  })
})
