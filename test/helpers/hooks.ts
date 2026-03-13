import nock from 'nock'

export const mochaHooks = {
  afterEach(done: () => void) {
    nock.cleanAll()
    done()
  },
}
