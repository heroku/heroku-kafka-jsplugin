'use strict';
exports.topic = {
  name: 'kafka',
  description: ''
};

exports.commands = [
  require('./commands/create_topic.js'),
  require('./commands/list_topics.js'),
  require('./commands/delete_topic.js'),
  require('./commands/fail.js'),
  require('./commands/info.js'),
  require('./commands/wait.js'),
  require('./commands/tail.js'),
  require('./commands/write.js')
];
