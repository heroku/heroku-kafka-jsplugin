## Heroku Kafka Plugin

A plugin to manage Heroku Kafka.

```
$ heroku kafka -h

Additional commands, type "heroku help COMMAND" for more details:

  kafka:configure TOPIC [CLUSTER]  #  Configures a topic in kafka
  kafka:create TOPIC [CLUSTER]     #  Creates a topic in kafka
  kafka:delete TOPIC [CLUSTER]     #  deletes a topic in kafka
  kafka:fail [CLUSTER]             #  triggers failure on one Kafka node in the cluster
  kafka:info [CLUSTER]             #  shows information about the state of your Heroku Kafka cluster
  kafka:topic TOPIC [CLUSTER]      #  shows information about a topic in your Heroku kafka cluster
  kafka:topics:list                #  lists available kafka topics, including their replicas and partitions
  kafka:topics:tail                #  tails a topic in kafka
  kafka:topics:write MESSAGE       #  writes a message to a kafka topic
  kafka:wait [CLUSTER]             #  Waits until the kafka cluster is ready to use
```

## Install

``` sh-session
$ heroku plugins:install heroku-kafka
```

## Deploying

Bump the version number (on master, don't do a PR), then `npm publish`.
Whilst this remains a private thing you'll need Heroku NPM creds from the CLI team.
