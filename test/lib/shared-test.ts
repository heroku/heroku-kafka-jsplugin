import {expect} from 'chai'
import {describe, it} from 'mocha'

import * as shared from '../../src/lib/shared.ts'
import {captureOutput} from '../helpers/run-command.js'

describe('parseDuration', function () {
  const cases = [
    ['10', 10],
    ['10ms', 10],
    ['10 ms', 10],
    ['10 milliseconds', 10],
    ['1 millisecond', 1],

    ['10s', 10 * 1000],
    ['10 s', 10 * 1000],
    ['1 second', 1 * 1000],
    ['10 seconds', 10 * 1000],

    ['10m', 10 * 1000 * 60],
    ['10 m', 10 * 1000 * 60],
    ['1 minute', 1 * 1000 * 60],
    ['10 minutes', 10 * 1000 * 60],

    ['10h', 10 * 1000 * 60 * 60],
    ['10 h', 10 * 1000 * 60 * 60],
    ['1 hour', 1 * 1000 * 60 * 60],
    ['10 hours', 10 * 1000 * 60 * 60],

    ['10d', 10 * 1000 * 60 * 60 * 24],
    ['10 d', 10 * 1000 * 60 * 60 * 24],
    ['1 day', 1 * 1000 * 60 * 60 * 24],
    ['10 days', 10 * 1000 * 60 * 60 * 24],

    ['1 fortnight', null],
  ]
  for (const testcase of cases) {
    const duration = testcase[0]
    const expected = testcase[1]

    it(`parses '${duration}' as '${expected}'`, function () {
      const actual = shared.parseDuration(duration)
      expect(actual).to.equal(expected)
    })
  }
})

describe('isZookeeperAllowed', function () {
  const cases = [
    [{plan: {name: 'standard-0'}}, false],
    [{plan: {name: 'standard-1'}}, false],
    [{plan: {name: 'standard-2'}}, false],
    [{plan: {name: 'extended-0'}}, false],
    [{plan: {name: 'extended-1'}}, false],
    [{plan: {name: 'extended-2'}}, false],
    [{plan: {name: 'private-standard-0'}}, true],
    [{plan: {name: 'private-standard-1'}}, true],
    [{plan: {name: 'private-standard-2'}}, true],
    [{plan: {name: 'private-extended-0'}}, true],
    [{plan: {name: 'private-extended-1'}}, true],
    [{plan: {name: 'private-extended-2'}}, true],
    [{plan: {name: 'shield-standard-0'}}, false],
    [{plan: {name: 'shield-standard-1'}}, false],
    [{plan: {name: 'shield-standard-2'}}, false],
    [{plan: {name: 'shield-extended-0'}}, false],
    [{plan: {name: 'shield-extended-1'}}, false],
    [{plan: {name: 'shield-extended-2'}}, false],
  ]
  for (const testcase of cases) {
    const addon = testcase[0]
    const expected = testcase[1]

    it(`considers '${addon.plan.name}' to${expected ? '' : ' not'} be allowed to enable zookeeper'`, function () {
      const actual = shared.isZookeeperAllowed(addon)
      expect(actual).to.equal(expected)
    })
  }
})

describe('parseBool', function () {
  const cases = [
    ['yes', true],
    ['true', true],
    ['on', true],
    ['enable', true],

    ['no', false],
    ['false', false],
    ['off', false],
    ['disable', false],

    ['nope', undefined],
    ['yep', undefined],
  ]
  for (const testcase of cases) {
    const str = testcase[0]
    const expected = testcase[1]

    it(`parses '${str}' as '${expected}'`, function () {
      const actual = shared.parseBool(str)
      expect(actual).to.equal(expected)
    })
  }
})

describe('deprecated', function () {
  it('returns a function that prints a warning and runs the command', async function () {
    let context: any
    let heroku: any
    const fn = async (c: any, h: any) => {
      context = c
      heroku = h
      return 42
    }

    const wrapped = shared.deprecated(fn, 'new-command')

    const passedContext = {command: {command: 'foo', topic: 'bar'}}
    const passedHeroku = {}

    const {stderr} = await captureOutput(async () => {
      await wrapped(passedContext, passedHeroku)
    })

    expect(context).to.eq(passedContext)
    expect(heroku).to.eq(passedHeroku)
    expect(stderr).to.match(/WARNING: bar:foo is deprecated; please use bar:new-command/m)
  })
})

describe('formatIntervalFromMilliseconds', function () {
  const cases = [
    [10, '10 milliseconds'],
    [999, '999 milliseconds'],
    [1000, '1 second'],
    [((10 * 1000) + 10), '10 seconds 10 milliseconds'],
    [((10 * 60 * 1000) + 10), '10 minutes 10 milliseconds'],
    [((10 * 60 * 1000) + (10 * 1000) + 10), '10 minutes 10 seconds 10 milliseconds'],
    [((10 * 60 * 1000) + (10 * 1000)), '10 minutes 10 seconds'],
    [((20 * 60 * 60 * 1000) + (10 * 60 * 1000) + (10 * 1000)), '20 hours 10 minutes 10 seconds'],
    [((3 * 24 * 60 * 60 * 1000) + (10 * 60 * 1000) + (10 * 1000)), '3 days 10 minutes 10 seconds'],
    [((3 * 24 * 60 * 60 * 1000) + 10), '3 days 10 milliseconds'],
    [((1 * 24 * 60 * 60 * 1000) + 1), '1 day 1 millisecond'],
  ]

  for (const testcase of cases) {
    const duration = testcase[0]
    const expected = testcase[1]

    it(`formats ${duration} milliseconds as '${expected}'`, function () {
      const actual = shared.formatIntervalFromMilliseconds(duration)
      expect(actual).to.equal(expected)
    })
  }
})

describe('clusterConfig', () => {
  it('pulls out the correct values out of the config', () => {
    const attachment = {
      app: {name: 'sushi'},
      config_vars: [
        'KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY',
      ],
      name: 'kafka',
    }
    const config = {
      KAFKA_CLIENT_CERT: '<client cert>',
      KAFKA_CLIENT_CERT_KEY: '<client cert key>',
      KAFKA_TRUSTED_CERT: '<trusted cert>',
      KAFKA_URL: 'kafka://example.com',
    }
    const result = shared.clusterConfig(attachment, config)
    expect(result.url).to.equal('kafka://example.com')
    expect(result.trustedCert).to.equal('<trusted cert>')
    expect(result.clientCert).to.equal('<client cert>')
    expect(result.clientCertKey).to.equal('<client cert key>')
    expect(result.prefix).to.equal(undefined)
  })

  it('includes a prefix if one is present', () => {
    const attachment = {
      app: {name: 'sushi'},
      config_vars: [
        'KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY', 'KAFKA_PREFIX',
      ],
      name: 'kafka',
    }
    const config = {
      KAFKA_CLIENT_CERT: '<client cert>',
      KAFKA_CLIENT_CERT_KEY: '<client cert key>',
      KAFKA_PREFIX: 'vistula-1000.',
      KAFKA_TRUSTED_CERT: '<trusted cert>',
      KAFKA_URL: 'kafka://example.com',
    }
    const result = shared.clusterConfig(attachment, config)
    expect(result.url).to.equal('kafka://example.com')
    expect(result.trustedCert).to.equal('<trusted cert>')
    expect(result.clientCert).to.equal('<client cert>')
    expect(result.clientCertKey).to.equal('<client cert key>')
    expect(result.prefix).to.equal('vistula-1000.')
  })

  it('raises if an expected key is missing in the attachment metadata', () => {
    const attachment = {
      app: {name: 'sushi'},
      config_vars: [
        'KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT_KEY',
      ],
      name: 'kafka',
    }
    const config = {
      KAFKA_CLIENT_CERT: '<client cert>',
      KAFKA_CLIENT_CERT_KEY: '<client cert key>',
      KAFKA_PREFIX: 'vistula-1000.',
      KAFKA_TRUSTED_CERT: '<trusted cert>',
      KAFKA_URL: 'kafka://example.com',
    }
    expect(() => shared.clusterConfig(attachment, config))
    .to.throw(`Could not find CLIENT_CERT for ${attachment.name} on ${attachment.app.name}`)
  })

  it('raises if an expected value is missing in the app environment', () => {
    const attachment = {
      app: {name: 'sushi'},
      config_vars: [
        'KAFKA_URL', 'KAFKA_TRUSTED_CERT', 'KAFKA_CLIENT_CERT', 'KAFKA_CLIENT_CERT_KEY',
      ],
      name: 'kafka',
    }
    const config = {
      KAFKA_CLIENT_CERT_KEY: '<client cert key>',
      KAFKA_PREFIX: 'vistula-1000.',
      KAFKA_TRUSTED_CERT: '<trusted cert>',
      KAFKA_URL: 'kafka://example.com',
    }
    expect(() => shared.clusterConfig(attachment, config))
    .to.throw(`Config value CLIENT_CERT for ${attachment.name} on ${attachment.app.name} is empty`)
  })
})
