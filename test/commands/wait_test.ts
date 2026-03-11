import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'
import esmock from 'esmock'
import cli from '@heroku/heroku-cli-util'
import nock from 'nock'

const all = [
  {name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: {name: 'heroku-kafka:beta-3'}},
  {name: 'kafka-2', id: '00000000-0000-0000-0000-000000000001', plan: {name: 'heroku-kafka:beta-3'}}
]

const fetcher = () => {
  return {
    all: () => all,
    addon: () => all[0]
  }
}

const cmd = await esmock('../../commands/wait.ts', {
  '../../lib/fetcher.ts': fetcher
})

describe('kafka:wait', () => {
  let kafka: nock.Scope
  const waitUrl = (cluster: string): string => {
    return `/data/kafka/v0/clusters/${cluster}/wait_status`
  }

  beforeEach(() => {
    cli.mockConsole()
    cli.exit.mock()
    kafka = nock('https://api.data.heroku.com')
  })

  afterEach(() => {
    kafka.done()
    nock.cleanAll()
  })

  it('waits for a cluster to be available', () => {
    kafka
      .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'waiting?': true, message: 'pending'})
      .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'waiting?': false, message: 'available'})

    return cmd.default.run({app: 'myapp', args: {CLUSTER: 'KAFKA_URL'}, flags: {'wait-interval': '1'}})
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(`Waiting for cluster kafka-1... pending
Waiting for cluster kafka-1... available
`))
  })

  it('waits for all clusters to be available', () => {
    kafka
      .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'waiting?': false})
      .get(waitUrl('00000000-0000-0000-0000-000000000001')).reply(200, {'waiting?': false})

    return cmd.default.run({app: 'myapp', args: {}, flags: {}})
      .then(() => expect(cli.stdout, 'to equal', ''))
      .then(() => expect(cli.stderr, 'to equal', ''))
  })

  it('displays errors', () => {
    kafka
      .get(waitUrl('00000000-0000-0000-0000-000000000000')).reply(200, {'error?': true, message: 'this is an error message'})

    return cmd.default.run({app: 'myapp', args: {}, flags: {}})
      .catch(err => {
        if (err.code !== 1) throw err
        expect(cli.stdout, 'to equal', '')
        expect(cli.stderr, 'to equal', ' ▸    this is an error message\n')
      })
  })
})
