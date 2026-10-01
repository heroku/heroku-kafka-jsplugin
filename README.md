## Heroku Kafka Plugin

A plugin to manage Heroku Kafka.

# Usage
<!-- usage -->
```sh-session
$ npm install -g heroku-kafka
$ heroku COMMAND
running command...
$ heroku (--version)
heroku-kafka/3.0.5 linux-x64 node-v22.23.2
$ heroku --help [COMMAND]
USAGE
  $ heroku COMMAND
...
```
<!-- usagestop -->

# Commands
<!-- commands -->
# Command Topics

* [`heroku kafka`](docs/kafka.md) - manage heroku kafka clusters

<!-- commandsstop -->

## Install

``` sh-session
$ heroku plugins:install heroku-kafka
```

## Development

For normal development, the initial setup is:
``` sh-session
# ensure node 20.x or higher is installed
$ npm install
$ heroku plugins:link
```
