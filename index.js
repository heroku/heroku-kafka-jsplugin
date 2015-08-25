'use strict';
exports.topic = {
  name: 'kafka',
  description: ''
}

exports.commands = [
  require('./commands/create_topic.js'),
  require('./commands/list_topics.js'),
]
