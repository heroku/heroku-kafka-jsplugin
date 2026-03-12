import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'




import esmock from 'esmock'
import expectExit from '../expect_exit.js'

import cli from '@heroku/heroku-cli-util'
import nock from 'nock'
import { Addon } from '../../lib/shared.js'

let planName
const withCluster = async (
  heroku: any,
  app: string,
  cluster: string | undefined,
  callback: (addon: Addon) => Promise<void>
) => {
  await callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: { name: planName } })
}

const cmd = await esmock('../../commands/zookeeper.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})

describe('kafka:zookeeper', () => {
  let kafka: nock.Scope

  const configUrl = (cluster: string):string => {
    return `/data/kafka/v0/clusters/${cluster}/zookeeper`
  }

  beforeEach(() => {
    planName = 'heroku-kafka:private-standard-2'
    kafka = nock('https://api.data.heroku.com:443')
    cli.mockConsole()
    cli.exit.mock()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('warns and exits with an error if used with a non-Private Spaces cluster', () => {
    planName = 'heroku-kafka:standard-2'
    return expectExit(1, cmd.default.run({app: 'myapp', args: { VALUE: 'enable' }}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(' ▸    `kafka:zookeeper` is only available in Heroku Private Spaces\n'))
  })

  describe('with unknown value specified', () => {
    it('shows an error and exits', () => {
      return expectExit(1, cmd.default.run({app: 'myapp', args: { VALUE: 'yep' }}))
        .then(() => expect(cli.stdout).to.be.empty)
        .then(() => expect(cli.stderr).to.equal(` ▸    Unknown value 'yep': must be 'on' or 'enable' to enable, or 'off' or
 ▸    'disable' to disable
`))
    })
  })

  const validEnable = [ 'enable', 'on' ]
  validEnable.forEach((value) => {
    it(`turns zookeeper on with argument ${value}`, () => {
      kafka.post(configUrl('00000000-0000-0000-0000-000000000000'), { enabled: true }).reply(200)

      return cmd.default.run({app: 'myapp', args: { VALUE: value }})
        .then(() => expect(cli.stderr).to.equal('Enabling Zookeeper access... done\n'))
        .then(() => expect(cli.stdout).to.be.empty)
    })
  })

  const validDisable = [ 'disable', 'off' ]
  validDisable.forEach((value) => {
    it(`turns zookeeper off with argument ${value}`, () => {
      kafka.post(configUrl('00000000-0000-0000-0000-000000000000'), { enabled: false }).reply(200)

      return cmd.default.run({app: 'myapp', args: { VALUE: value }})
        .then(() => expect(cli.stderr).to.equal('Disabling Zookeeper access... done\n'))
        .then(() => expect(cli.stdout).to.be.empty)
    })
  })
})
