import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import Credentials from '../../../src/commands/kafka/credentials.js'
import {runCommand} from '../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:credentials', () => {
  let kafka: nock.Scope

  const credentialsUrl = (cluster: string): string => `/data/kafka/${VERSION}/clusters/${cluster}/rotate-credentials`

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('rotates credentials', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:private-standard-2'},
      },
      name: 'KAFKA',
    }])

    kafka.post(credentialsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {message: 'Rotated'})

    const {stdout} = await runCommand(Credentials, ['--app', 'myapp', '--reset'])
    expect(stdout).to.equal('Rotated\n')
    api.done()
    kafka.done()
  })

  it('requires the --reset flag', async () => {
    const {error} = await runCommand(Credentials, ['--app', 'myapp'])
    expect(error?.message).to.include('Missing required flag reset')
  })
})
