import {
  afterEach, beforeEach, describe, it,
} from 'mocha'
import nock from 'nock'
import expect from 'unexpected'

import * as resolve from '../../src/lib/resolve.js'

// Create a mock Heroku client that just uses nock for HTTP calls
function createMockClient() {
  return {
    async get(url: string, options?: any) {
      const res = await fetch(`https://api.heroku.com${url}`, {
        headers: options?.headers || {},
        method: 'GET',
      })
      if (!res.ok) {
        const error: any = new Error(`HTTP ${res.status}`)
        error.statusCode = res.status
        try {
          error.body = await res.json()
        } catch (e) {
          error.body = {}
        }

        throw error
      }

      return res.json()
    },
    async post(url: string, options?: any) {
      const res = await fetch(`https://api.heroku.com${url}`, {
        body: JSON.stringify(options?.body || {}),
        headers: options?.headers || {},
        method: 'POST',
      })
      if (!res.ok) {
        const error: any = new Error(`HTTP ${res.status}`)
        error.statusCode = res.status
        try {
          error.body = await res.json()
        } catch (e) {
          error.body = {}
        }

        throw error
      }

      return res.json()
    },
  } as any
}

describe('resolve', () => {
  beforeEach(function () {
    resolve.addon.cache.clear()
  })

  afterEach(() => nock.cleanAll())

  describe('addon', () => {
    it('finds a single matching addon', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-1', app: null}).reply(200, {body: [{name: 'myaddon-1'}]})

      return resolve.addon(createMockClient(), null, 'myaddon-1')
      .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-1'}))
      .then(() => api.done())
    })

    it('finds a single matching addon for an app', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-2', app: 'myapp'}).reply(200, {body: [{name: 'myaddon-2'}]})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-2')
      .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-2'}))
      .then(() => api.done())
    })

    it('fails if no addon found', () => {
      nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-3', app: 'myapp'}).reply(404, {resource: 'add_on'})
      .post('/actions/addons/resolve', {addon: 'myaddon-3', app: null}).reply(404, {resource: 'add_on'})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-3')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 404}))
    })

    it('fails if no addon found with addon-service', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-3', addon_service: 'slowdb', app: 'myapp'}).reply(404, {resource: 'add_on'})
      .post('/actions/addons/resolve', {addon: 'myaddon-3', addon_service: 'slowdb', app: null}).reply(404, {resource: 'add_on'})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-3', {addon_service: 'slowdb'})
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 404}))
      .then(() => api.done())
    })

    it('fails if errored', () => {
      nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-5', app: 'myapp'}).reply(401)

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-5')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 401}))
    })

    it('fails if ambiguous', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-5', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-5'}, {name: 'myaddon-6'}]})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-5')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(function (err) {
        api.done()
        expect(err, 'to satisfy', {message: 'Ambiguous identifier; multiple matching add-ons found: myaddon-5, myaddon-6.', type: 'addon'})
      })
    })

    it('fails if no addon found', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-3', addon_service: 'slowdb', app: 'myapp'}).reply(404, {resource: 'add_on'})
      .post('/actions/addons/resolve', {addon: 'myaddon-3', addon_service: 'slowdb', app: null}).reply(404, {resource: 'add_on'})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-3', {addon_service: 'slowdb'})
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 404}))
      .then(() => {
        api.done()
      })
    })

    it('fails if app not found', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-3', addon_service: 'slowdb', app: 'myapp'}).reply(404, {resource: 'app'})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-3', {addon_service: 'slowdb'})
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {body: {resource: 'app'}, statusCode: 404}))
      .then(() => {
        api.done()
      })
    })

    it('finds the addon with null namespace for an app if no namespace is specified', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-1', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-1', namespace: null}, {name: 'myaddon-1b', namespace: 'definitely-not-null'}]})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-1')
      .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-1'}))
      .then(() => api.done())
    })

    it('finds the addon with no namespace for an app if no namespace is specified', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-1', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-1'}, {name: 'myaddon-1b', namespace: 'definitely-not-null'}]})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-1')
      .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-1'}))
      .then(() => api.done())
    })

    it('finds the addon with the specified namespace for an app if there are multiple addons', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-1', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-1'}, {name: 'myaddon-1b', namespace: 'great-namespace'}]})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-1', {namespace: 'great-namespace'})
      .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-1b'}))
      .then(() => api.done())
    })

    it('finds the addon with the specified namespace for an app if there is only one addon', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-1', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-1b', namespace: 'great-namespace'}]})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-1', {namespace: 'great-namespace'})
      .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-1b'}))
      .then(() => api.done())
    })

    it('fails if there is no addon with the specified namespace for an app', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-1', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-1'}]})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-1', {namespace: 'amazing-namespace'})
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 404}))
      .then(() => {
        api.done()
      })
    })

    it('finds the addon with a namespace for an app if there is only match which happens to have a namespace', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-1', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-1', namespace: 'definitely-not-null'}]})

      return resolve.addon(createMockClient(), 'myapp', 'myaddon-1')
      .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-1'}))
      .then(() => api.done())
    })

    describe('memoization', () => {
      it('memoizes an addon for an app', () => {
        const api = nock('https://api.heroku.com:443')
        .post('/actions/addons/resolve', {addon: 'myaddon-6', app: 'myapp'}).reply(200, {body: [{name: 'myaddon-6'}]})

        return resolve.addon(createMockClient(), 'myapp', 'myaddon-6')
        .then(function (addon) {
          expect(addon, 'to satisfy', {name: 'myaddon-6'})
          api.done()
        })
        .then(function () {
          nock.cleanAll()

          return resolve.addon(createMockClient(), 'myapp', 'myaddon-6')
          .then(function (memoizedAddon) {
            expect(memoizedAddon, 'to satisfy', {name: 'myaddon-6'})
          })
        })
        .then(function () {
          const diffId = nock('https://api.heroku.com:443')
          .post('/actions/addons/resolve', {addon: 'myaddon-7', app: 'myapp'}).reply(200, {body: [{name: 'myaddon-7'}]})

          return resolve.addon(createMockClient(), 'myapp', 'myaddon-7')
          .then(function (diffIdAddon) {
            expect(diffIdAddon, 'to satisfy', {name: 'myaddon-7'})
            diffId.done()
          })
        })
        .then(function () {
          const diffApp = nock('https://api.heroku.com:443')
          .post('/actions/addons/resolve', {addon: 'myaddon-6', app: 'fooapp'}).reply(200, {body: [{name: 'myaddon-6'}]})

          return resolve.addon(createMockClient(), 'fooapp', 'myaddon-6')
          .then(function (diffAppAddon) {
            expect(diffAppAddon, 'to satisfy', {name: 'myaddon-6'})
            diffApp.done()
          })
        })
        .then(function () {
          const diffAddonService = nock('https://api.heroku.com:443')
          .post('/actions/addons/resolve', {addon: 'myaddon-6', addon_service: 'slowdb', app: 'fooapp'}).reply(200, {body: [{name: 'myaddon-6'}]})

          return resolve.addon(createMockClient(), 'fooapp', 'myaddon-6', {addon_service: 'slowdb'})
          .then(function (diffAddonServiceAddon) {
            expect(diffAddonServiceAddon, 'to satisfy', {name: 'myaddon-6'})
            diffAddonService.done()
          })
        })
      })

      it('does not memoize errors', () => {
        const api = nock('https://api.heroku.com:443')
        .post('/actions/addons/resolve', {addon: 'myaddon-8', app: 'myapp'}).reply(403, {id: 'two_factor'})

        return resolve.addon(createMockClient(), 'myapp', 'myaddon-8')
        .then(() => {
          throw new Error('unreachable')
        })
        .catch(err => expect(err.body, 'to satisfy', {id: 'two_factor'}))
        .then(() => api.done())
        .then(function () {
          nock.cleanAll()

          const apiRetry = nock('https://api.heroku.com:443')
          .post('/actions/addons/resolve', {addon: 'myaddon-8', app: 'myapp'}).reply(200, {body: [{name: 'myaddon-8'}]})

          return resolve.addon(createMockClient(), 'myapp', 'myaddon-8')
          .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-8'}))
          .then(() => apiRetry.done())
        })
        .then(function () {
          nock.cleanAll()

          return resolve.addon(createMockClient(), 'myapp', 'myaddon-8')
          .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-8'}))
        })
      })
    })
  })

  describe('attachment', () => {
    it('finds a single matching attachment', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment', app: null}).reply(200, {body: [{name: 'myattachment'}]})

      return resolve.attachment(createMockClient(), null, 'myattachment')
      .then(addon => expect(addon, 'to satisfy', {name: 'myattachment'}))
      .then(() => api.done())
    })

    it('finds a single matching attachment for an app', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-1', app: 'myapp'}).reply(200, {body: [{name: 'myattachment-1'}]})

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-1')
      .then(addon => expect(addon, 'to satisfy', {name: 'myattachment-1'}))
      .then(() => api.done())
    })

    it('passes on errors getting attachment', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment', app: null}).reply(401)

      return resolve.attachment(createMockClient(), null, 'myattachment')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 401}))
      .then(() => api.done())
    })

    it('passes on errors getting app/attachment', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-2', app: 'myapp'}).reply(401)

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-2')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 401}))
      .then(() => api.done())
    })

    it('falls back to searching by addon', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-3', app: 'myapp'}).reply(404, {resource: 'add_on attachment'})

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-3', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-3'}]})

      const appAttachment = nock('https://api.heroku.com:443')
      .get('/addons/1e97e8ba-fd24-48a4-8118-eaf287eb7a0f/addon-attachments').reply(200, {body: [{app: {name: 'myapp'}, name: 'some-random-name'}]})

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-3')
      .then(addon => expect(addon, 'to satisfy', {name: 'some-random-name'}))
      .then(() => api.done())
      .then(() => appAddon.done())
      .then(() => appAttachment.done())
    })

    it('falls back to searching by addon and addon_service', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-3', addon_service: 'slowdb', app: 'myapp'}).reply(404, {resource: 'add_on attachment'})

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-3', addon_service: 'slowdb', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-3'}]})

      const appAttachment = nock('https://api.heroku.com:443')
      .get('/addons/1e97e8ba-fd24-48a4-8118-eaf287eb7a0f/addon-attachments').reply(200, {body: [{addon_service: {name: 'slowdb'}, app: {name: 'myapp'}, name: 'some-random-name'}]})

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-3', {addon_service: 'slowdb'})
      .then(addon => expect(addon, 'to satisfy', {name: 'some-random-name'}))
      .then(() => api.done())
      .then(() => appAddon.done())
      .then(() => appAttachment.done())
    })

    it('falls back to searching by addon and addon_service when ambigious', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-3', addon_service: 'slowdb', app: 'myapp'}).reply(200, {
        body: [
          {app: {name: 'myapp'}, name: 'some-random-name-1'},
          {app: {name: 'myapp'}, name: 'some-random-name-2'},
        ],
      })

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-3', addon_service: 'slowdb', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-3'}]})

      const appAttachment = nock('https://api.heroku.com:443')
      .get('/addons/1e97e8ba-fd24-48a4-8118-eaf287eb7a0f/addon-attachments').reply(200, {body: [{addon_service: {name: 'slowdb'}, app: {name: 'myapp'}, name: 'some-random-name'}]})

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-3', {addon_service: 'slowdb'})
      .then(addon => expect(addon, 'to satisfy', {name: 'some-random-name'}))
      .then(() => api.done())
      .then(() => appAddon.done())
      .then(() => appAttachment.done())
    })

    it('throws original error when ambigious and searching by addon and addon_service is ambigious', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-3', addon_service: 'slowdb', app: 'myapp'}).reply(200, {
        body: [
          {app: {name: 'myapp'}, name: 'some-random-name-1'},
          {app: {name: 'myapp'}, name: 'some-random-name-2'},
        ],
      })

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-3', addon_service: 'slowdb', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-3'}]})

      const appAttachment = nock('https://api.heroku.com:443')
      .get('/addons/1e97e8ba-fd24-48a4-8118-eaf287eb7a0f/addon-attachments').reply(200, {
        body: [
          {addon_service: {name: 'slowdb'}, app: {name: 'myapp'}, name: 'some-random-name-a'},
          {addon_service: {name: 'slowdb'}, app: {name: 'myapp'}, name: 'some-random-name-b'},
        ],
      })

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-3', {addon_service: 'slowdb'})
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(function (err) {
        api.done()
        appAddon.done()
        appAttachment.done()
        expect(err, 'to satisfy', {message: 'Ambiguous identifier; multiple matching add-ons found: some-random-name-1, some-random-name-2.', type: 'addon_attachment'})
      })
    })

    it('falls back to searching by addon and ignores addon_service if not passed', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-3', app: 'myapp'}).reply(404)

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-3', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-3'}]})

      const appAttachment = nock('https://api.heroku.com:443')
      .get('/addons/1e97e8ba-fd24-48a4-8118-eaf287eb7a0f/addon-attachments').reply(200, {body: [{addon_service: {name: 'slowdb'}, app: {name: 'myapp'}, name: 'some-random-name'}]})

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-3')
      .then(addon => expect(addon, 'to satisfy', {name: 'some-random-name'}))
      .then(() => api.done())
      .then(() => appAddon.done())
      .then(() => appAttachment.done())
    })

    it('throws an error when not found', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-4', app: 'myapp'}).reply(404, {resource: 'add_on attachment'})

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-4', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-4'}]})

      const appAttachment = nock('https://api.heroku.com:443')
      .get('/addons/1e97e8ba-fd24-48a4-8118-eaf287eb7a0f/addon-attachments').reply(200, {body: [{app: {name: 'not-myapp'}, name: 'some-random-name'}]})

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-4')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {message: 'Couldn\'t find that addon.'}))
      .then(() => api.done())
      .then(() => appAddon.done())
      .then(() => appAttachment.done())
    })

    it('throws an error when app not found', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-4', app: 'myapp'}).reply(404, {resource: 'app'})

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-4', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-4'}]})

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-4')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {body: {resource: 'app'}}))
      .then(() => api.done())
      .then(() => appAddon.done())
    })

    it('throws an error when not found with addon_service', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-3', addon_service: 'slowdb', app: 'myapp'}).reply(404, {resource: 'add_on attachment'})

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-3', addon_service: 'slowdb', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-3'}]})

      const appAttachment = nock('https://api.heroku.com:443')
      .get('/addons/1e97e8ba-fd24-48a4-8118-eaf287eb7a0f/addon-attachments').reply(200, {body: [{addon_service: {name: 'not-slowdb'}, app: {name: 'myapp'}, name: 'some-random-name'}]})

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-3', {addon_service: 'slowdb'})
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {message: 'Couldn\'t find that addon.'}))
      .then(() => api.done())
      .then(() => appAddon.done())
      .then(() => appAttachment.done())
    })

    it('does not fallback and throws error when there is no app', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-4', app: null}).reply(404, {resource: 'add_on attachment'})

      return resolve.attachment(createMockClient(), null, 'myattachment-4')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {message: 'Couldn\'t find that addon.'}))
      .then(() => api.done())
    })

    it('throws an error when ambiguous', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-5', app: 'myapp'}).reply(404, {resource: 'add_on attachment'})

      const appAddon = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myattachment-5', app: 'myapp'}).reply(200, {body: [{id: '1e97e8ba-fd24-48a4-8118-eaf287eb7a0f', name: 'myaddon-5'}]})

      const appAttachment = nock('https://api.heroku.com:443')
      .get('/addons/1e97e8ba-fd24-48a4-8118-eaf287eb7a0f/addon-attachments').reply(200, {
        body: [
          {app: {name: 'myapp'}, name: 'some-random-name-1'},
          {app: {name: 'myapp'}, name: 'some-random-name-2'},
        ],
      })

      return resolve.attachment(createMockClient(), 'myapp', 'myattachment-5')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {message: 'Ambiguous identifier; multiple matching add-ons found: some-random-name-1, some-random-name-2.', type: 'addon_attachment'}))
      .then(() => api.done())
      .then(() => appAddon.done())
      .then(() => appAttachment.done())
    })
  })

  describe('appAddon', () => {
    it('finds a single matching addon for an app', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-2', app: 'myapp'}).reply(200, {body: [{name: 'myaddon-2'}]})

      return resolve.appAddon(createMockClient(), 'myapp', 'myaddon-2')
      .then(addon => expect(addon, 'to satisfy', {name: 'myaddon-2'}))
      .then(() => api.done())
    })

    it('fails if not found', () => {
      nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-5', app: 'myapp'}).reply(404)

      return resolve.appAddon(createMockClient(), 'myapp', 'myaddon-5')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 404}))
    })

    it('fails if ambiguous', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addons/resolve', {addon: 'myaddon-5', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-5'}, {name: 'myaddon-6'}]})

      return resolve.appAddon(createMockClient(), 'myapp', 'myaddon-5')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(function (err) {
        api.done()
        expect(err, 'to satisfy', {message: 'Ambiguous identifier; multiple matching add-ons found: myaddon-5, myaddon-6.', type: 'addon'})
      })
    })
  })

  describe('appAttachment', () => {
    it('finds a single matching attachment for an app', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment-1', app: 'myapp'}).reply(200, {body: [{name: 'myattachment-1'}]})

      return resolve.appAttachment(createMockClient(), 'myapp', 'myattachment-1')
      .then(addon => expect(addon, 'to satisfy', {name: 'myattachment-1'}))
      .then(() => api.done())
    })

    it('fails if not found', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myattachment', app: null}).reply(404)

      return resolve.appAttachment(createMockClient(), null, 'myattachment')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(err => expect(err, 'to satisfy', {statusCode: 404}))
      .then(() => api.done())
    })

    it('fails if ambiguous', () => {
      const api = nock('https://api.heroku.com:443')
      .post('/actions/addon-attachments/resolve', {addon_attachment: 'myaddon-5', app: 'myapp'})
      .reply(200, {body: [{name: 'myaddon-5'}, {name: 'myaddon-6'}]})

      return resolve.appAttachment(createMockClient(), 'myapp', 'myaddon-5')
      .then(() => {
        throw new Error('unreachable')
      })
      .catch(function (err) {
        expect(err, 'to satisfy', {message: 'Ambiguous identifier; multiple matching add-ons found: myaddon-5, myaddon-6.', type: 'addon_attachment'})
        api.done()
      })
    })
  })
})
