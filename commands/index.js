'use strict'
exports.topic = {
  name: 'kafka',
  description: 'manage heroku kafka clusters'
}

exports.commands = [
  require('./credentials_rotate.js'),
  require('./topics_compaction.js'),
  require('./topics_replication_factor.js'),
  require('./topics_retention_time.js'),
  require('./consumer_groups.js'),
  require('./consumer_groups_create.js'),
  require('./consumer_groups_destroy.js'),
  require('./fail.js'),
  require('./upgrade.js'),
  require('./info.js').info,
  require('./info.js').root,
  require('./wait.js'),
  require('./zookeeper.js'),

  // new versions of commands with deprecated variants
  require('./topics.js').cmd,
  require('./topics_create.js').cmd,
  require('./topics_destroy.js').cmd,
  require('./topics_info.js').cmd,
  require('./topics_tail.js').cmd,
  require('./topics_write.js').cmd,

  // deprecated

  // configure is easier to do as a separate command since it's a 1 -> 3 mapping
  require('./configure.js'),

  // aliases for deprecated commands
  require('./topics_create.js').deprecated,
  require('./topics_destroy.js').deprecated,
  require('./topics_info.js').deprecated,
  require('./topics.js').deprecated,
  require('./topics_tail.js').deprecated,
  require('./topics_write.js').deprecated
]
