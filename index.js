'use strict';
exports.topic = {
  name: 'kafka',
  description: ''
}

exports.commands = [
  require('./commands/topics.js'),
]
