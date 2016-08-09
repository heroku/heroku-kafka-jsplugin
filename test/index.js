'use strict'

const expect = require('chai').expect
const mocha = require('mocha')
const describe = mocha.describe
const it = mocha.it

var index = require('../index')

describe('commands', function () {
  index.commands.forEach(function (command) {
    let cmd = 'cmd' in command ? command.cmd : command
    it(`${cmd.topic}:${cmd.command} takes a CLUSTER argument`, function () {
      expect(cmd.args.map(function (arg) { return arg.name })).to.include('CLUSTER')
    })
  })
})
