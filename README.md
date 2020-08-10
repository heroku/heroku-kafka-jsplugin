## Heroku Kafka Plugin

[![Build Status](https://travis-ci.org/heroku/heroku-kafka-jsplugin.svg?branch=main)](https://travis-ci.org/heroku/heroku-kafka-jsplugin)
[![Coverage Status](https://coveralls.io/repos/github/heroku/heroku-kafka-jsplugin/badge.svg?branch=main)](https://coveralls.io/github/heroku/heroku-kafka-jsplugin?branch=main)

A plugin to manage Heroku Kafka.

```
heroku kafka:consumer-groups [CLUSTER]                         # lists available Kafka consumer groups
heroku kafka:consumer-groups:create CONSUMER_GROUP [CLUSTER]   # creates a consumer group in Kafka
heroku kafka:consumer-groups:destroy CONSUMER_GROUP [CLUSTER]  # destroys a consumer group in Kafka
heroku kafka:fail [CLUSTER]                                    # triggers failure on one node in the cluster
heroku kafka:info [CLUSTER]                                    # display cluster information
heroku kafka:topics [CLUSTER]                                  # lists available Kafka topics
heroku kafka:topics:compaction TOPIC VALUE [CLUSTER]           # configures topic compaction in Kafka
heroku kafka:topics:create TOPIC [CLUSTER]                     # creates a topic in Kafka
heroku kafka:topics:destroy TOPIC [CLUSTER]                    # deletes a topic in Kafka
heroku kafka:topics:info TOPIC [CLUSTER]                       # shows information about a topic in Kafka
heroku kafka:topics:replication-factor TOPIC VALUE [CLUSTER]   # configures topic replication factor in Kafka
heroku kafka:topics:retention-time TOPIC VALUE [CLUSTER]       # configures topic retention time (e.g. 10d, 36h)
heroku kafka:topics:tail TOPIC [CLUSTER]                       # tails a topic in Kafka
heroku kafka:topics:write TOPIC MESSAGE [CLUSTER]              # writes a message to a Kafka topic
heroku kafka:upgrade [CLUSTER]                                 # upgrades kafka broker version
heroku kafka:wait [CLUSTER]                                    # waits until Kafka is ready to use
```

## Install

``` sh-session
$ heroku plugins:install heroku-kafka
```

## Development

For normal development, the initial setup is:
``` sh-session
# ensure node 8.x is installed
$ yarn
$ heroku plugins:link
```


## Publishing

To publish new versions, see
[the data plugin documentation](https://github.com/heroku/dod-ops/blob/master/playbooks/cli-plugins.md).
