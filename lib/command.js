'use strict'

const Base = require('cli-engine-command').default
const Heroku = require('cli-engine-command/lib/heroku').default
const HerokuClient = require('heroku-client')

class Command extends Base {
  get heroku () {
    if (this._heroku) return this._heroku
    let h = new Heroku(this.out, {preauth: true})
    let options = {
      userAgent: h.requestOptions.headers['user-agent'],
      debug: process.env.HEROKU_DEBUG,
      token: h.auth,
      host: `${h.requestOptions.protocol}//${h.requestOptions.host}`
    }
    this._heroku = new HerokuClient(options)
    return this._heroku
  }
}

exports.default = Command
