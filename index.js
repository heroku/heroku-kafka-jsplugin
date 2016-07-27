'use strict'
exports.topic = {
  name: 'kafka',
  description: 'manage heroku kafka clusters'
}

exports.commands = [
  require('./commands/create_topic.js'),
  require('./commands/configure_topic.js'),
  require('./commands/delete_topic.js'),
  require('./commands/fail.js'),
  require('./commands/upgrade.js'),
  require('./commands/info.js'),
  require('./commands/list_topics.js'),
  require('./commands/topic.js'),
  require('./commands/wait.js'),
  require('./commands/write.js'),
  require('./commands/tail.js')
]
