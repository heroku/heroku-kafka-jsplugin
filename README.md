## Heroku Kafka Plugin

[![Build Status](https://travis-ci.org/heroku/heroku-kafka-jsplugin.svg?branch=master)](https://travis-ci.org/heroku/heroku-kafka-jsplugin)
[![Coverage Status](https://coveralls.io/repos/github/heroku/heroku-kafka-jsplugin/badge.svg?branch=master)](https://coveralls.io/github/heroku/heroku-kafka-jsplugin?branch=master)

A plugin to manage Heroku Kafka.

```
kafka:fail [CLUSTER]                                   #  triggers failure on one node in the cluster
kafka:info [CLUSTER]                                   #  display cluster information
kafka:topics [CLUSTER]                                 #  lists available Kafka topics
kafka:topics:compaction TOPIC VALUE [CLUSTER]          #  configures topic compaction in Kafka
kafka:topics:create TOPIC [CLUSTER]                    #  creates a topic in Kafka
kafka:topics:destroy TOPIC [CLUSTER]                   #  deletes a topic in Kafka
kafka:topics:info TOPIC [CLUSTER]                      #  shows information about a topic in Kafka
kafka:topics:replication-factor TOPIC VALUE [CLUSTER]  #  configures topic replication factor in Kafka
kafka:topics:retention-time TOPIC VALUE [CLUSTER]      #  configures topic retention time in Kafka
kafka:topics:tail TOPIC [CLUSTER]                      #  tails a topic in Kafka
kafka:topics:write TOPIC MESSAGE [CLUSTER]             #  writes a message to a Kafka topic
kafka:upgrade [CLUSTER]                                #  upgrades kafka broker version
kafka:wait [CLUSTER]                                   #  waits until Kafka is ready to use
```

## Install

``` sh-session
$ heroku plugins:install heroku-kafka
```

## Development

For normal development, the initial setup is:
``` sh-session
# ensure node 6.x is installed
$ npm install
$ heroku plugins:link .
```

If you add a new command, change a command's args/flags or other metadata, you need to re-run `plugins:link`


## Deploying

First pick the new version number X.Y.Z based on the current
version. Following SemVer, fixes should bump the patch version, new
commands should bump the minor, and major and breaking changes should
bump the major. Avoid breaking changes and be sure to discuss them
with Product first.

 * Check out branch X.Y.Z
 * Run `npm version X.Y.Z` (this will create a commit and tag it)
 * Push branch X.Y.Z to GitHub with `--tags` flag and submit a pull request
 * Once the pull request is approved, merge the branch into master
   locally, and push master directly to GitHub. This will implicitly
   merge the outstanding pull request.
 * Run `npm publish` to deploy the new version

The unorthodox mechanism around merging the PR is to preserve git tags
on the version bump commit, to make it easier to check out a
particular version. Note that if there are commits to master between
submitting a pull request and getting it approved, you will need to
first rebase the pull request on top of master and then force-push to
update the original X.Y.Z branch on GitHub. The final merge must be
fast-forward to preserve the semantics of the tag.
