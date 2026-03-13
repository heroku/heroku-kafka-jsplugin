import {expect} from 'chai'
import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'

import Zookeeper from '../../../src/commands/kafka/zookeeper.js'
import {runCommand} from '../../helpers/run-command.js'

const VERSION = 'v0'

describe('kafka:zookeeper', () => {
  let kafka: nock.Scope

  const zookeeperUrl = (cluster: string): string => `/data/kafka/${VERSION}/clusters/${cluster}/zookeeper`

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('shows an error and exits with unknown value', async () => {
    const {error} = await runCommand(Zookeeper, ['yep', '--app', 'myapp'])
    expect(error?.message).to.include("Unknown value 'yep'")
  })

  it('warns and exits with an error if used with a non-Private Spaces cluster', async () => {
    const api = nock('https://api.heroku.com:443')
    .get('/apps/myapp/addon-attachments')
    .reply(200, [{
      addon: {
        id: '00000000-0000-0000-0000-000000000000',
        name: 'kafka-1',
        plan: {name: 'heroku-kafka:standard-2'},
      },
      name: 'KAFKA',
    }])

    const {error} = await runCommand(Zookeeper, ['enable', '--app', 'myapp'])
    expect(error?.message).to.include('`kafka:zookeeper` is only available in Heroku Private Spaces')
    api.done()
  })

  const validEnable = ['enable', 'on']
  for (const value of validEnable) {
    it(`turns zookeeper on with argument ${value}`, async () => {
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

      kafka.post(zookeeperUrl('00000000-0000-0000-0000-000000000000')).reply(200)

      const {stdout} = await runCommand(Zookeeper, [value, '--app', 'myapp'])
      expect(stdout).to.equal('')
      api.done()
      kafka.done()
    })
  }

  const validDisable = ['disable', 'off']
  for (const value of validDisable) {
    it(`turns zookeeper off with argument ${value}`, async () => {
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

      kafka.post(zookeeperUrl('00000000-0000-0000-0000-000000000000')).reply(200)

      const {stdout} = await runCommand(Zookeeper, [value, '--app', 'myapp'])
      expect(stdout).to.equal('')
      api.done()
      kafka.done()
    })
  }
})
