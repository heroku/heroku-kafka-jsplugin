'use strict'
exports.topic = {
  name: 'kafka',
  description: 'manage heroku kafka clusters'
}

exports.commands = [
  require('./commands/credentials_rotate.js'),
  require('./commands/jmx.js'),
  require('./commands/topics_compaction.js'),
  require('./commands/topics_info.js'),
  require('./commands/topics_replication_factor.js'),
  require('./commands/topics_retention_time.js'),
  require('./commands/consumer_groups.js'),
  require('./commands/consumer_groups_create.js'),
  require('./commands/fail.js'),
  require('./commands/upgrade.js'),
  require('./commands/info.js').info,
  require('./commands/info.js').root,
  require('./commands/wait.js'),
  require('./commands/zookeeper.js'),

  // new versions of commands with deprecated variants
  require('./commands/topics.js').cmd,
  require('./commands/topics_create.js').cmd,
  require('./commands/topics_destroy.js').cmd,
  require('./commands/topics_info.js').cmd,
  require('./commands/topics_tail.js').cmd,
  require('./commands/topics_write.js').cmd,

  // deprecated

  // configure is easier to do as a separate command since it's a 1 -> 3 mapping
  require('./commands/configure.js'),

  // aliases for deprecated commands
  require('./commands/topics_create.js').deprecated,
  require('./commands/topics_destroy.js').deprecated,
  require('./commands/topics_info.js').deprecated,
  require('./commands/topics.js').deprecated,
  require('./commands/topics_tail.js').deprecated,
  require('./commands/topics_write.js').deprecated
]
