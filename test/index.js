'use strict';

require('chai').should();
var index = require('../index.js');

describe('commands', function () {
  index.commands.forEach(function(command) {
    it(`${command.topic}:${command.command} takes a CLUSTER argument`, function () {
      command.args.map(function (arg) { return arg.name; }).should.include('CLUSTER');
    });
  });
});
