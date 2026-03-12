import chai from 'chai'
import chaiAsPromised from 'chai-as-promised'
import {describe, it, beforeEach, afterEach} from 'mocha'
import esmock from 'esmock'
import cli from '@heroku/heroku-cli-util'
import nock from 'nock'
import { Addon } from '../../src/lib/shared.js'

chai.use(chaiAsPromised)
const {expect} = chai

let planName: string
const withCluster = async (heroku: any, app: string, cluster: string | undefined, callback: (addon: Addon) => Promise<void>) => {
  await callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: { name: planName } })
}

const cmd = await esmock('../../commands/credentials_rotate.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})

describe('kafka:credentials', () => {
  let kafka: nock.Scope

  const credentialsUrl = (cluster: string): string => {
    return `/data/kafka/v0/clusters/${cluster}/rotate-credentials`
  }

  beforeEach(() => {
    planName = 'heroku-kafka:beta-private-standard-2'
    kafka = nock('https://api.data.heroku.com:443')
    cli.mockConsole()
    cli.exit.mock()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('rotates credentials', () => {
    kafka.post(credentialsUrl('00000000-0000-0000-0000-000000000000')).reply(200, {message: 'Rotated'})

    return cmd.default.run({app: 'myapp', args: {CLUSTER: undefined}, flags: { reset: true }})
      .then(() => expect(cli.stderr).to.be.empty)
  })

  it('requires the --reset flag', () => {
    return expect(cmd.default.run({app: 'myapp', args: {CLUSTER: undefined}, flags: {}}))
      .to.be.rejected
      .then((err) => {
        expect(cli.stdout).to.be.empty
        expect(cli.stderr).to.be.empty
        expect(err.message).to.equal('The --reset flag is required for this command')
      })
  })
})
