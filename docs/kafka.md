`heroku kafka`
==============

manage heroku kafka clusters

* [`heroku kafka [CLUSTER]`](#heroku-kafka-cluster)
* [`heroku kafka:consumer-groups [CLUSTER]`](#heroku-kafkaconsumer-groups-cluster)
* [`heroku kafka:consumer-groups:create CONSUMER_GROUP [CLUSTER]`](#heroku-kafkaconsumer-groupscreate-consumer_group-cluster)
* [`heroku kafka:consumer-groups:destroy CONSUMER_GROUP [CLUSTER]`](#heroku-kafkaconsumer-groupsdestroy-consumer_group-cluster)
* [`heroku kafka:credentials [CLUSTER]`](#heroku-kafkacredentials-cluster)
* [`heroku kafka:fail [CLUSTER]`](#heroku-kafkafail-cluster)
* [`heroku kafka:info [CLUSTER]`](#heroku-kafkainfo-cluster)
* [`heroku kafka:topics [CLUSTER]`](#heroku-kafkatopics-cluster)
* [`heroku kafka:topics:compaction TOPIC VALUE [CLUSTER]`](#heroku-kafkatopicscompaction-topic-value-cluster)
* [`heroku kafka:topics:create TOPIC [CLUSTER]`](#heroku-kafkatopicscreate-topic-cluster)
* [`heroku kafka:topics:destroy TOPIC [CLUSTER]`](#heroku-kafkatopicsdestroy-topic-cluster)
* [`heroku kafka:topics:info TOPIC [CLUSTER]`](#heroku-kafkatopicsinfo-topic-cluster)
* [`heroku kafka:topics:replication-factor TOPIC VALUE [CLUSTER]`](#heroku-kafkatopicsreplication-factor-topic-value-cluster)
* [`heroku kafka:topics:retention-time TOPIC VALUE [CLUSTER]`](#heroku-kafkatopicsretention-time-topic-value-cluster)
* [`heroku kafka:topics:tail TOPIC [CLUSTER]`](#heroku-kafkatopicstail-topic-cluster)
* [`heroku kafka:topics:write TOPIC MESSAGE [CLUSTER]`](#heroku-kafkatopicswrite-topic-message-cluster)
* [`heroku kafka:upgrade [CLUSTER]`](#heroku-kafkaupgrade-cluster)
* [`heroku kafka:wait [CLUSTER]`](#heroku-kafkawait-cluster)
* [`heroku kafka:zookeeper VALUE [CLUSTER]`](#heroku-kafkazookeeper-value-cluster)

## `heroku kafka [CLUSTER]`

display cluster information

```
USAGE
  $ heroku kafka [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  display cluster information

ALIASES
  $ heroku kafka

EXAMPLES
  $ heroku kafka

  $ heroku kafka:info

  $ heroku kafka:info HEROKU_KAFKA_BROWN_URL
```

## `heroku kafka:consumer-groups [CLUSTER]`

lists available Kafka consumer groups

```
USAGE
  $ heroku kafka:consumer-groups [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  lists available Kafka consumer groups

EXAMPLES
  $ heroku kafka:consumer-groups

  $ heroku kafka:consumer-groups kafka-aerodynamic-32763
```

_See code: [src/commands/kafka/consumer-groups/index.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/consumer-groups/index.ts)_

## `heroku kafka:consumer-groups:create CONSUMER_GROUP [CLUSTER]`

creates a consumer group in Kafka

```
USAGE
  $ heroku kafka:consumer-groups:create CONSUMER_GROUP [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  CONSUMER_GROUP  consumer group name
  [CLUSTER]       cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  creates a consumer group in Kafka

EXAMPLES
  $ heroku kafka:consumer-groups:create word-counters

  $ heroku kafka:consumer-groups:create word-counters kafka-aerodynamic-32763
```

_See code: [src/commands/kafka/consumer-groups/create.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/consumer-groups/create.ts)_

## `heroku kafka:consumer-groups:destroy CONSUMER_GROUP [CLUSTER]`

destroys a consumer group in Kafka

```
USAGE
  $ heroku kafka:consumer-groups:destroy CONSUMER_GROUP [CLUSTER] -a <value> [--prompt] [-r <value>] [--confirm <value>]

ARGUMENTS
  CONSUMER_GROUP  consumer group name
  [CLUSTER]       cluster to operate on

FLAGS
  -a, --app=<value>      (required) app to run command against
  -r, --remote=<value>   git remote of app to use
      --confirm=<value>  pass the app name to skip the manual confirmation prompt

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  destroys a consumer group in Kafka

EXAMPLES
  $ heroku kafka:consumer-groups:destroy word-counters

  $ heroku kafka:consumer-groups:destroy word-counters kafka-aerodynamic-32763
```

_See code: [src/commands/kafka/consumer-groups/destroy.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/consumer-groups/destroy.ts)_

## `heroku kafka:credentials [CLUSTER]`

triggers credential rotation

```
USAGE
  $ heroku kafka:credentials [CLUSTER] -a <value> --reset [--prompt] [-r <value>]

ARGUMENTS
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use
      --reset           (required) reset credentials

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  triggers credential rotation

EXAMPLES
  $ heroku kafka:credentials --reset

  $ heroku kafka:credentials KAFKA_RED_URL --reset
```

_See code: [src/commands/kafka/credentials.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/credentials.ts)_

## `heroku kafka:fail [CLUSTER]`

triggers failure on one node in the cluster

```
USAGE
  $ heroku kafka:fail [CLUSTER] -a <value> [--prompt] [-r <value>] [--catastrophic] [--zookeeper] [--confirm
    <value>]

ARGUMENTS
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>      (required) app to run command against
  -r, --remote=<value>   git remote of app to use
      --catastrophic     terminate the underlying instance instead and allow automation to replace it
      --confirm=<value>  pass the app name to skip the manual confirmation prompt
      --zookeeper        induce failure on one of the cluster's Zookeeper nodes instead

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  triggers failure on one node in the cluster

EXAMPLES
  $ heroku kafka:fail

  $ heroku kafka:fail kafka-aerodynamic-32763
```

_See code: [src/commands/kafka/fail.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/fail.ts)_

## `heroku kafka:info [CLUSTER]`

display cluster information

```
USAGE
  $ heroku kafka:info [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  display cluster information

ALIASES
  $ heroku kafka

EXAMPLES
  $ heroku kafka

  $ heroku kafka:info

  $ heroku kafka:info HEROKU_KAFKA_BROWN_URL
```

_See code: [src/commands/kafka/info.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/info.ts)_

## `heroku kafka:topics [CLUSTER]`

lists available Kafka topics

```
USAGE
  $ heroku kafka:topics [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  lists available Kafka topics

EXAMPLES
  $ heroku kafka:topics

  $ heroku kafka:topics HEROKU_KAFKA_BROWN_URL
```

_See code: [src/commands/kafka/topics/index.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/index.ts)_

## `heroku kafka:topics:compaction TOPIC VALUE [CLUSTER]`

configures topic compaction in Kafka

```
USAGE
  $ heroku kafka:topics:compaction TOPIC VALUE [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  TOPIC      topic name
  VALUE      enable or disable
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  configures topic compaction in Kafka

EXAMPLES
  $ heroku kafka:topics:compaction page-visits enable

  $ heroku kafka:topics:compaction page-visits disable kafka-shiny-2345
```

_See code: [src/commands/kafka/topics/compaction.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/compaction.ts)_

## `heroku kafka:topics:create TOPIC [CLUSTER]`

creates a topic in Kafka

```
USAGE
  $ heroku kafka:topics:create TOPIC [CLUSTER] -a <value> [--prompt] [-r <value>] [--partitions <value>]
    [--replication-factor <value>] [--retention-time <value>] [--compaction]

ARGUMENTS
  TOPIC      topic name
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>                 (required) app to run command against
  -r, --remote=<value>              git remote of app to use
      --compaction                  whether to use compaction for this topic
      --partitions=<value>          number of partitions to give the topic
      --replication-factor=<value>  number of replicas the topic should be created across
      --retention-time=<value>      length of time messages in the topic should be retained (at least 24h)

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  creates a topic in Kafka

EXAMPLES
  $ heroku kafka:topics:create page-visits --partitions 100

  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --replication-factor 3 --retention-time 10d

  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --compaction
```

_See code: [src/commands/kafka/topics/create.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/create.ts)_

## `heroku kafka:topics:destroy TOPIC [CLUSTER]`

deletes a topic in Kafka

```
USAGE
  $ heroku kafka:topics:destroy TOPIC [CLUSTER] -a <value> [--prompt] [-r <value>] [--confirm <value>]

ARGUMENTS
  TOPIC      topic name
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>      (required) app to run command against
  -r, --remote=<value>   git remote of app to use
      --confirm=<value>  pass the app name to skip the manual confirmation prompt

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  deletes a topic in Kafka

EXAMPLES
  $ heroku kafka:topics:destroy page-visits

  $ heroku kafka:topics:destroy page-visits HEROKU_KAFKA_BROWN_URL
```

_See code: [src/commands/kafka/topics/destroy.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/destroy.ts)_

## `heroku kafka:topics:info TOPIC [CLUSTER]`

shows information about a topic in Kafka

```
USAGE
  $ heroku kafka:topics:info TOPIC [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  TOPIC      topic name
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  shows information about a topic in Kafka

EXAMPLES
  $ heroku kafka:topics:info page-visits

  $ heroku kafka:topics:info page-visits HEROKU_KAFKA_BROWN_URL
```

_See code: [src/commands/kafka/topics/info.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/info.ts)_

## `heroku kafka:topics:replication-factor TOPIC VALUE [CLUSTER]`

configures topic replication factor in Kafka

```
USAGE
  $ heroku kafka:topics:replication-factor TOPIC VALUE [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  TOPIC      topic name
  VALUE      replication factor
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  configures topic replication factor in Kafka

EXAMPLES
  $ heroku kafka:topics:replication-factor page-visits 3

  $ heroku kafka:topics:replication-factor page-visits 3 HEROKU_KAFKA_BROWN_URL
```

_See code: [src/commands/kafka/topics/replication-factor.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/replication-factor.ts)_

## `heroku kafka:topics:retention-time TOPIC VALUE [CLUSTER]`

configures or disables topic retention time (e.g. 10d, 36h)

```
USAGE
  $ heroku kafka:topics:retention-time TOPIC VALUE [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  TOPIC      topic name
  VALUE      retention time (e.g. 10d, 36h) or disable
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  configures or disables topic retention time (e.g. 10d, 36h)

EXAMPLES
  $ heroku kafka:topics:retention-time page-visits 10d

  $ heroku kafka:topics:retention-time page-visits disable

  $ heroku kafka:topics:retention-time page-visits 36h kafka-shiny-2345
```

_See code: [src/commands/kafka/topics/retention-time.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/retention-time.ts)_

## `heroku kafka:topics:tail TOPIC [CLUSTER]`

tails a topic in Kafka

```
USAGE
  $ heroku kafka:topics:tail TOPIC [CLUSTER] -a <value> [--prompt] [-r <value>] [--max-length <value>]

ARGUMENTS
  TOPIC      topic name
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>         (required) app to run command against
  -r, --remote=<value>      git remote of app to use
      --max-length=<value>  number of characters per message to output

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  tails a topic in Kafka

EXAMPLES
  $ heroku kafka:topics:tail page-visits

  $ heroku kafka:topics:tail page-visits kafka-aerodynamic-32763

  $ heroku kafka:topics:tail page-visits --max-length 200
```

_See code: [src/commands/kafka/topics/tail.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/tail.ts)_

## `heroku kafka:topics:write TOPIC MESSAGE [CLUSTER]`

writes a message to a Kafka topic

```
USAGE
  $ heroku kafka:topics:write TOPIC MESSAGE [CLUSTER] -a <value> [--prompt] [-r <value>] [--key <value>] [--partition
    <value>]

ARGUMENTS
  TOPIC      topic name
  MESSAGE    message to write
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>        (required) app to run command against
  -r, --remote=<value>     git remote of app to use
      --key=<value>        the key for this message
      --partition=<value>  the partition to write to

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  writes a message to a Kafka topic

EXAMPLES
  $ heroku kafka:topics:write page_visits "1441025138,www.example.com,192.168.2.13"

  $ heroku kafka:topics:write page_visits "1441025138,www.example.com,192.168.2.13" kafka-aerodynamic-32763
```

_See code: [src/commands/kafka/topics/write.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/topics/write.ts)_

## `heroku kafka:upgrade [CLUSTER]`

upgrades kafka broker version

```
USAGE
  $ heroku kafka:upgrade [CLUSTER] -a <value> --version <value> [--prompt] [-r <value>] [--confirm <value>]

ARGUMENTS
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>      (required) app to run command against
  -r, --remote=<value>   git remote of app to use
      --confirm=<value>  pass the app name to skip the manual confirmation prompt
      --version=<value>  (required) requested kafka version for upgrade

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  upgrades kafka broker version

EXAMPLES
  $ heroku kafka:upgrade --version 0.9
```

_See code: [src/commands/kafka/upgrade.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/upgrade.ts)_

## `heroku kafka:wait [CLUSTER]`

waits until Kafka is ready to use

```
USAGE
  $ heroku kafka:wait [CLUSTER] -a <value> [--prompt] [-r <value>] [--wait-interval <value>]

ARGUMENTS
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>            (required) app to run command against
  -r, --remote=<value>         git remote of app to use
      --wait-interval=<value>  how frequently to poll in seconds (to avoid rate limiting)

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  waits until Kafka is ready to use

EXAMPLES
  $ heroku kafka:wait

  $ heroku kafka:wait HEROKU_KAFKA_BROWN
```

_See code: [src/commands/kafka/wait.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/wait.ts)_

## `heroku kafka:zookeeper VALUE [CLUSTER]`

(Private Spaces only) control direct access to Zookeeper of your Kafka cluster

```
USAGE
  $ heroku kafka:zookeeper VALUE [CLUSTER] -a <value> [--prompt] [-r <value>]

ARGUMENTS
  VALUE      on/off, enable/disable
  [CLUSTER]  cluster to operate on

FLAGS
  -a, --app=<value>     (required) app to run command against
  -r, --remote=<value>  git remote of app to use

GLOBAL FLAGS
  --prompt  interactively prompt for command arguments and flags

DESCRIPTION
  (Private Spaces only) control direct access to Zookeeper of your Kafka cluster

EXAMPLES
  $ heroku kafka:zookeeper enable

  $ heroku kafka:zookeeper disable HEROKU_KAFKA_BROWN_URL
```

_See code: [src/commands/kafka/zookeeper.ts](https://github.com/heroku/heroku-kafka-jsplugin/blob/v2.13.0/src/commands/kafka/zookeeper.ts)_
