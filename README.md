## Heroku Kafka Plugin

A plugin to manage Heroku Kafka.

```
$ heroku kafka -h
Additional commands, type "heroku help COMMAND" for more details:

  kafka:info                  #  display cluster information and status
  kafka:topics:create         #  creates a topic in kafka
  kafka:topics:delete         #  deletes a topic in kafka
  kafka:topics:list           #  lists available kafka topics, including their replicas and partitions
  kafka:topics:tail           #  tails a topic in kafka
  kafka:topics:write MESSAGE  #  writes a message to a kafka topic
  kafka:wait                  #  wait until cluster becomes available
```

## Install

For now, since this isn't published on `npm`, you can install it like so:

``` sh-session
$ git clone https://github.com/heroku/heroku-kafka-jsplugin.git heroku-kafka-jsplugin
$ cd heroku-kafka-jsplugin
$ npm install                # dependencies
$ heroku plugins:link
```

If you run into any problems, open an issue. You can remove the plugin in the
meantime if it's borked:

``` sh-session
$ rm ~/.heroku/node_modules/heroku-kafka-jsplugin
```
