'use strict';
module.exports = {
  topic: 'kafka',
  command: 'create-topic',
  description: 'creates a topic in kafka',
  help: '',
  needsApp: true,
  needsAuth: true,
  flags: [
    {name: 'topic', char: 't', description: 'topic name to create', hasValue: true, optional: false}
  ],
  run: function (context) {
    console.log('hello world' + context.flags.topic);
  }
}
