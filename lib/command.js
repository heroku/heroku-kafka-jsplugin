'use strict'

const Base = require('cli-engine-command').default
const Heroku = require('cli-engine-command/lib/heroku').default
const {vars} = require('cli-engine-command/lib/heroku')
const HerokuClient = require('heroku-client')
const Netrc = require('netrc-parser')

class Command extends Base {
  get heroku () {
    if (this._heroku) return this._heroku
    let _heroku = new Heroku(this.out, {preauth: true})
    const netrc = new Netrc()
    let auth = 'Basic ' + new Buffer(netrc.machines[vars.apiHost].login + ':' + _heroku.auth).toString('base64')
    _heroku.requestOptions.headers.authorization = auth
    this._heroku = new HerokuClient(_heroku.requestOptions)
    return this._heroku
  }
}

exports.default = Command
