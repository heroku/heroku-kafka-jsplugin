'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it
const beforeEach = mocha.beforeEach
const afterEach = mocha.beforeEach
const proxyquire = require('proxyquire')

const cli = require('heroku-cli-util')
const nock = require('nock')

let addon
let all = [
  {name: 'kafka-1', plan: {name: 'heroku-kafka:beta-3'}},
  {name: 'kafka-2', plan: {name: 'heroku-kafka:beta-3'}}
]

const fetcher = () => {
  return {
    all: () => all,
    addon: () => addon
  }
}

const cmd = proxyquire('../../commands/info', {
  '../lib/fetcher': fetcher
}).info

describe('kafka:info', () => {
  let api, kafka

  let infoUrl = (cluster) => {
    return `/client/kafka/v0/clusters/${cluster}`
  }

  beforeEach(() => {
    api = nock('https://api.heroku.com:443')
    kafka = nock('https://kafka-api.heroku.com:443')
    cli.mockConsole()
  })

  afterEach(() => {
    nock.cleanAll()
    api.done()
    kafka.done()
  })

  describe('with 0 dbs', () => {
    it('shows empty state', () => {
      all = []

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal('myapp has no heroku-kafka clusters.\n'))
        .then(() => expect(cli.stderr).to.be.empty)
    })
  })

  describe('with 2 dbs', () => {
    let plan = {name: 'heroku-kafka:beta-3'}
    let config = {
      KAFKA_URL: 'kafka+ssl://ec2-1-1-1-1.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-2.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-3.compute-1.amazonaws.com:9096',
      HEROKU_KAFKA_COBALT_URL: 'kafka+ssl://ec2-1-1-1-1.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-2.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-1-3.compute-1.amazonaws.com:9096',
      HEROKU_KAFKA_PURPLE_URL: 'kafka+ssl://ec2-1-1-2-1.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-2-2.compute-1.amazonaws.com:9096,kafka+ssl://ec2-1-1-2-3.compute-1.amazonaws.com:9096'
    }
    let addonService = {name: 'heroku-kafka'}
    let addons = [
      {id: 1, name: 'kafka-1', addon_service: addonService, plan},
      {id: 2, name: 'kafka-2', addon_service: addonService, plan}
    ]
    let clusterA = {
      info: [
        {name: 'Plan', values: ['Beta-3']},
        {name: 'Empty', values: []}
      ],
      attachment_name: 'KAFKA_URL',
      resource_url: config.KAFKA_URL
    }
    let clusterB = {
      info: [
        {name: 'Plan', values: ['Beta-3']}
      ],
      attachment_name: 'HEROKU_KAFKA_PURPLE_URL',
      resource_url: config.HEROKU_KAFKA_PURPLE_URL
    }

    it('shows kafka info', () => {
      all = addons

      api.get('/apps/myapp/config-vars').reply(200, config)
      kafka
        .get(infoUrl('kafka-1')).reply(200, clusterA)
        .get(infoUrl('kafka-2')).reply(200, clusterB)

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stderr).to.be.empty)
        .then(() => expect(cli.stdout).to.equal(`=== KAFKA_URL, HEROKU_KAFKA_COBALT_URL
Plan:   Beta-3
Add-on: kafka-1

=== HEROKU_KAFKA_PURPLE_URL
Plan:   Beta-3
Add-on: kafka-2

`))
    })

    it('shows kafka info for single cluster when arg sent in', () => {
      addon = addons[1]
      api.get('/apps/myapp/config-vars').reply(200, config)

      kafka
        .get(infoUrl('kafka-2'))
        .reply(200, clusterB)

      return cmd.run({app: 'myapp', args: {CLUSTER: 'kafka-2'}})
        .then(() => expect(cli.stderr).to.be.empty)
        .then(() => expect(cli.stdout).to.equal(`=== HEROKU_KAFKA_PURPLE_URL
Plan:   Beta-3
Add-on: kafka-2

`))
    })

    it('shows warning for 404', () => {
      all = addons

      api.get('/apps/myapp/config-vars').reply(200, config)
      kafka
        .get(infoUrl('kafka-1')).reply(404)
        .get(infoUrl('kafka-2')).reply(200, clusterB)

      return cmd.run({app: 'myapp', args: {}})
        .then(() => expect(cli.stdout).to.equal(`=== HEROKU_KAFKA_PURPLE_URL
Plan:   Beta-3
Add-on: kafka-2

`))
        .then(() => expect(cli.stderr).to.equal(` ▸    kafka-1 is not yet provisioned.
 ▸    Run heroku kafka:wait to wait until the cluster is provisioned.
`))
    })
  })
})
