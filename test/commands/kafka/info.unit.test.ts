import {expect} from 'chai'
import {
  describe, it, beforeEach, afterEach,
} from 'mocha'
import nock from 'nock'
import {runCommand} from '../../helpers/run-command.js'
import Info from '../../../src/commands/kafka/info.js'

const VERSION = 'v0'

describe('kafka:info', () => {
  let kafka: nock.Scope

  const infoUrl = (cluster: string): string => {
    return `/data/kafka/${VERSION}/clusters/${cluster}`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')
  })

  afterEach(() => {
    nock.cleanAll()
  })

  describe('with 0 clusters', () => {
    it('shows empty state', async () => {
      const api = nock('https://api.heroku.com:443')
      .get('/apps/myapp/addon-attachments')
      .reply(200, [])
      .get('/apps/myapp/addon-attachments')
      .reply(200, [])

      const {stdout} = await runCommand(Info, ['--app', 'myapp'])
      expect(stdout).to.include('myapp has no heroku-kafka clusters.')
      api.done()
      kafka.done()
    })
  })

  describe('with 2 clusters', () => {
    const plan = {name: 'heroku-kafka:beta-3'}
    const addon_service = {name: 'heroku-kafka'}
    const attachments = [
      {
        addon: {
          name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan, addon_service,
        }, name: 'KAFKA',
      },
      {
        addon: {
          name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan, addon_service,
        }, name: 'HEROKU_KAFKA_COBALT',
      },
      {
        addon: {
          name: 'kafka-2', id: '00000000-0000-0000-0000-000000000001', plan, addon_service,
        }, name: 'HEROKU_KAFKA_PURPLE',
      },
    ]
    const clusterA = {
      addon: {name: 'kafka-1'},
      state: {message: 'available'},
      robot: {is_robot: false},
      topics: ['__consumer_offsets', 'messages'],
      limits: {},
      partition_replica_count: 132,
      messages_in_per_sec: 0,
      bytes_in_per_sec: 0,
      bytes_out_per_sec: 0,
      version: ['0.10.0.0'],
      customer_encryption_key: 'arn:aws:kms:us-east-1:123456789012:key/a1b23c4d-a1b2-c3d4-e5f6-a1b2c3d4e5f6',
      created_at: '2016-11-14T14:26:20.245+00:00',
    }
    const clusterB = {
      addon: {name: 'kafka-2'},
      state: {message: 'available'},
      robot: {is_robot: false},
      topics: ['__consumer_offsets', 'messages'],
      limits: {max_topics: 10, max_partition_replica_count: 32},
      partition_replica_count: 12,
      messages_in_per_sec: 0,
      bytes_in_per_sec: 0,
      bytes_out_per_sec: 0,
      version: ['0.10.0.0'],
      created_at: '2016-11-14T14:26:20.245+00:00',
    }

    it('shows kafka info', async () => {
      const api = nock('https://api.heroku.com:443')
      .get('/apps/myapp/addon-attachments')
      .times(2)
      .reply(200, attachments)

      kafka
      .get(infoUrl('00000000-0000-0000-0000-000000000000')).reply(200, clusterA)
      .get(infoUrl('00000000-0000-0000-0000-000000000001')).reply(200, clusterB)

      const {stdout} = await runCommand(Info, ['--app', 'myapp'])
      expect(stdout).to.include('KAFKA_URL, HEROKU_KAFKA_COBALT_URL')
      expect(stdout).to.match(/Plan:\s+heroku-kafka:beta-3/)
      expect(stdout).to.match(/Status:\s+available/)
      expect(stdout).to.match(/Version:\s+0\.10\.0\.0/)
      expect(stdout).to.include('1 topic')
      expect(stdout).to.include('Customer Encryption Key')
      expect(stdout).to.include('arn:aws:kms:us-east-1:123456789012:key/a1b23c4d-a1b2-c3d4-e5f6-a1b2c3d4e5f6')
      expect(stdout).to.match(/Add-on:\s+kafka-1/)
      expect(stdout).to.include('HEROKU_KAFKA_PURPLE_URL')
      expect(stdout).to.include('1 / 10 topics')
      expect(stdout).to.include('12 / 32 partition replicas')
      expect(stdout).to.match(/Add-on:\s+kafka-2/)
      api.done()
      kafka.done()
    })

    it('shows kafka info for single cluster when arg sent in', async () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve')
      .reply(200, [{
        addon: {name: 'kafka-2', id: '00000000-0000-0000-0000-000000000001', plan},
        name: 'HEROKU_KAFKA_PURPLE',
        app: {name: 'myapp'},
      }])
      .get('/apps/myapp/addon-attachments')
      .reply(200, attachments)

      kafka
      .get(infoUrl('00000000-0000-0000-0000-000000000001'))
      .reply(200, clusterB)

      const {stdout} = await runCommand(Info, ['kafka-2', '--app', 'myapp'])
      expect(stdout).to.include('HEROKU_KAFKA_PURPLE_URL')
      expect(stdout).to.match(/Plan:\s+heroku-kafka:beta-3/)
      expect(stdout).to.match(/Status:\s+available/)
      expect(stdout).to.include('1 / 10 topics')
      expect(stdout).to.include('12 / 32 partition replicas')
      expect(stdout).to.match(/Add-on:\s+kafka-2/)
      expect(stdout).not.to.include('kafka-1')
      api.done()
      kafka.done()
    })

    it('shows warning for 404', async () => {
      const api = nock('https://api.heroku.com:443')
      .get('/apps/myapp/addon-attachments')
      .reply(200, attachments)
      .get('/apps/myapp/addon-attachments')
      .reply(200, attachments)

      kafka
      .get(infoUrl('00000000-0000-0000-0000-000000000000')).reply(404)
      .get(infoUrl('00000000-0000-0000-0000-000000000001')).reply(200, clusterB)

      const {stdout, stderr} = await runCommand(Info, ['--app', 'myapp'])
      expect(stdout).to.include('HEROKU_KAFKA_PURPLE_URL')
      expect(stdout).to.include('kafka-2')
      expect(stdout).not.to.include('kafka-1')
      expect(stderr).to.include('kafka-1 is not yet provisioned')
      expect(stderr).to.include('Run heroku kafka:wait')
      api.done()
      kafka.done()
    })
  })
})
