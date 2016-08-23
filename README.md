## Heroku Kafka Plugin

[![Build Status](https://travis-ci.org/heroku/heroku-kafka-jsplugin.svg?branch=master)](https://travis-ci.org/heroku/heroku-kafka-jsplugin)

A plugin to manage Heroku Kafka.

```
kafka:configure TOPIC [CLUSTER]     #  configures a topic in Kafka
kafka:create TOPIC [CLUSTER]        #  creates a topic in Kafka
kafka:delete TOPIC [CLUSTER]        #  deletes a topic in Kafka
kafka:fail [CLUSTER]                #  triggers failure on one node in the cluster
kafka:info [CLUSTER]                #  shows information about the state of your Kafka cluster
kafka:list [CLUSTER]                #  lists available Kafka topics
kafka:tail TOPIC [CLUSTER]          #  tails a topic in Kafka
kafka:topic TOPIC [CLUSTER]         #  shows information about a topic in Kafka
kafka:wait [CLUSTER]                #  waits until Kafka is ready to use
kafka:write TOPIC MESSAGE [CLUSTER] #  write message to Kafka topic
```

## Install

``` sh-session
$ heroku plugins:install heroku-kafka
```

## Development

For normal development, the initial setup is:
``` sh-session
$ npm install
$ heroku plugins:link .
```

If you add a new command, change a command's args/flags or other metadata, you need to re-run `plugins:link`


## Deploying

Bump the version number (on master, don't do a PR), then `npm publish`.
