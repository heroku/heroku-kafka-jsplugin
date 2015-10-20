'use strict';

let cli = require('heroku-cli-util');
let co = require('co');
let HerokuKafkaResource = require('./resource.js').HerokuKafkaResource;

function* fail (context, heroku) {
  var fail = yield new HerokuKafkaResource(heroku, process.env, context)
    .fail(context.flags.catastrophic, context.flags.zookeeper);
  console.log(fail.message)
}

module.exports = {
  topic: 'kafka',
  command: 'fail',
  description: 'triggers failure on one Kafka node in the cluster',
  help: `
    Triggers failure on one node in the cluster.

    Examples:

    $ heroku kafka:fail
`,
  needsApp: true,
  needsAuth: true,
  flags: [
    {name: 'catastrophic', char: 'c',
     description: 'induce unrecoverable server failure on the single node',
     hasValue: false},
    {name: 'zookeeper', char: 'z',
     description: 'induce failure on zookeeper node rather than on Kafka itself',
     hasValue: false}
  ],
  run: cli.command(co.wrap(fail))
};
