export const topic = {
  name: 'kafka',
  description: 'manage heroku kafka clusters'
}

import credentialsRotate from './credentials_rotate.js'
import topicsCompaction from './topics_compaction.js'
import topicsReplicationFactor from './topics_replication_factor.js'
import topicsRetentionTime from './topics_retention_time.js'
import consumerGroups from './consumer_groups.js'
import consumerGroupsCreate from './consumer_groups_create.js'
import consumerGroupsDestroy from './consumer_groups_destroy.js'
import fail from './fail.js'
import upgrade from './upgrade.js'
import {info, root} from './info.js'
import wait from './wait.js'
import zookeeper from './zookeeper.js'
import {cmd as topicsCmd} from './topics.js'
import {cmd as topicsCreateCmd} from './topics_create.js'
import {cmd as topicsDestroyCmd} from './topics_destroy.js'
import {cmd as topicsInfoCmd} from './topics_info.js'
import {cmd as topicsTailCmd} from './topics_tail.js'
import {cmd as topicsWriteCmd} from './topics_write.js'

export const commands = [
  credentialsRotate,
  topicsCompaction,
  topicsReplicationFactor,
  topicsRetentionTime,
  consumerGroups,
  consumerGroupsCreate,
  consumerGroupsDestroy,
  fail,
  upgrade,
  info,
  root,
  wait,
  zookeeper,
  topicsCmd,
  topicsCreateCmd,
  topicsDestroyCmd,
  topicsInfoCmd,
  topicsTailCmd,
  topicsWriteCmd
]
