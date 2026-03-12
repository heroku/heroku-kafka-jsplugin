import {expect} from 'chai'
import {describe, it, beforeEach, afterEach} from 'mocha'




import esmock from 'esmock'
import expectExit from '../expect_exit.js'

import cli from '@heroku/heroku-cli-util'
import nock from 'nock'
import { Addon } from '../../lib/shared.js'

const withCluster = async (
  heroku: any,
  app: string,
  cluster: string | undefined,
  callback: (addon: Addon) => Promise<void>
) => {
  await callback({ name: 'kafka-1', id: '00000000-0000-0000-0000-000000000000', plan: { name: 'test' } })
}

const cmd = (await esmock('../../commands/topics_create.ts', {
  '../../lib/clusters.ts': {
    withCluster
  }
})).cmd

describe('kafka:topics:create', () => {
  let kafka: nock.Scope

  const createUrl = (cluster: string):string => {
    return `/data/kafka/v0/clusters/${cluster}/topics`
  }

  const infoUrl = (cluster: string):string => {
    return `/data/kafka/v0/clusters/${cluster}`
  }

  beforeEach(() => {
    kafka = nock('https://api.data.heroku.com:443')

    cli.exit.mock()
    cli.mockConsole()
  })

  afterEach(() => {
    nock.cleanAll()
    kafka.done()
  })

  it('shows an error and exits with an invalid retention time', () => {
    return expectExit(1, cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1' },
      flags: { 'retention-time': '2 eons' }}))
      .then(() => expect(cli.stdout).to.be.empty)
      .then(() => expect(cli.stderr).to.equal(' ▸    Could not parse retention time \'2 eons\'; expected value like \'10d\' or\n ▸    \'36h\'\n'))
  })

  it('passes the topic name and specified flags', () => {
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, { shared_cluster: false })
    kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 10,
          replication_factor: '3',
          partition_count: '7',
          compaction: false
        }
      }).reply(200)

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1' },
      flags: { 'replication-factor': '3',
        'retention-time': '10ms',
        'partitions': '7' }}
    )
      .then(() => {
        expect(cli.stderr).to.equal('Creating topic topic-1 with compaction disabled and retention time 10 milliseconds on kafka-1... done\n')
        expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
      })
  })

  it('includes the topic prefix and link in output if one exists', () => {
    const prefix = 'mill-4567.'
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, { topic_prefix: prefix })
    kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 10,
          replication_factor: '3',
          partition_count: '7',
          compaction: false
        }
      }).reply(200)

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1' },
      flags: { 'replication-factor': '3',
        'retention-time': '10ms',
        'partitions': '7' }}
    )
      .then(() => {
        expect(cli.stderr).to.equal('Creating topic topic-1 with compaction disabled and retention time 10 milliseconds on kafka-1... done\n')
        expect(cli.stdout).to.equal(`Use \`heroku kafka:topics:info topic-1\` to monitor your topic.\nYour topic is using the prefix ${prefix}. Learn more in Dev Center:\n  https://devcenter.heroku.com/articles/multi-tenant-kafka-on-heroku#connecting-kafka-prefix\n`)
      })
  })

  it('defaults retention to the plan minimum if not specified even if retention specified', () => {
    kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
      .reply(200, { shared_cluster: false, limits: { minimum_retention_ms: 66 } })
    kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
      {
        topic: {
          name: 'topic-1',
          retention_time_ms: 66,
          replication_factor: '3',
          partition_count: '7',
          compaction: false
        }
      }).reply(200)

    return cmd.run({app: 'myapp',
      args: { TOPIC: 'topic-1' },
      flags: { 'replication-factor': '3',
        'partitions': '7' }}
    )
      .then(() => {
        expect(cli.stderr).to.equal('Creating topic topic-1 with compaction disabled and retention time 66 milliseconds on kafka-1... done\n')
        expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
      })
  })

  describe('for multi-tenant plans', () => {
    it('defaults retention to the plan minimum if not specified even if compaction specified', () => {
      kafka.get(infoUrl('00000000-0000-0000-0000-000000000000'))
        .reply(200, { shared_cluster: true, limits: { minimum_retention_ms: 66 } })
      kafka.post(createUrl('00000000-0000-0000-0000-000000000000'),
        {
          topic: {
            name: 'topic-1',
            retention_time_ms: 66,
            replication_factor: '3',
            partition_count: '7',
            compaction: true
          }
        }).reply(200)

      return cmd.run({app: 'myapp',
        args: { TOPIC: 'topic-1' },
        flags: { 'replication-factor': '3',
          'partitions': '7',
          'compaction': true }}
      )
        .then(() => {
          expect(cli.stderr).to.equal('Creating topic topic-1 with compaction enabled and retention time 66 milliseconds on kafka-1... done\n')
          expect(cli.stdout).to.equal('Use `heroku kafka:topics:info topic-1` to monitor your topic.\n')
        })
    })
  })
})
