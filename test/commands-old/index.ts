import {expect} from 'chai'
import {describe, it} from 'mocha'
import * as index from '../commands/index.js'

describe('commands', function () {
  index.commands.forEach(function (command) {
    let cmd = 'cmd' in command ? command.cmd : command
    it(`${cmd.topic}:${cmd.command} takes a CLUSTER argument`, function () {
      expect(cmd.args.map(function (arg) { return arg.name })).to.include('CLUSTER')
    })
  })
})
