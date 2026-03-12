import {expect} from 'chai'
import {describe, it} from 'mocha'
import host from '../../lib/host.js'

describe('host', () => {
  it('is the default host', () => {
    expect(host()).to.equal('api.data.heroku.com')
  })
})
