var cli = require('heroku-cli-util')
var co = require('co')
var sleep = require('co-sleep')
var HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters
var Spinner = require('node-spinner')

function * kafkaWait (context, heroku) {
  var clusters = new HerokuKafkaClusters(heroku, process.env, context)
  var addons = yield clusters.addonsForManyClusterCommand(context.args.CLUSTER)
  if (!addons) {
    process.exit(1)
  } else {
    for (var i = 0; i < addons.length; i++) {
      var addon = addons[i]
      yield kafkaWaitSingle(clusters, addon)
    }
  }
}

function * kafkaWaitSingle (clusters, addon) {
  var s = Spinner()
  var checked = false
  var finished = false
  while (!finished) {
    var waitStatus = yield clusters.waitStatus(addon)
    if (!waitStatus || !waitStatus['waiting?']) {
      finished = true
      if (checked) {
        console.log('')
      }
    } else if (waitStatus['deprovisioned?']) {
      finished = true
      cli.warn('This cluster was deprovisioned.')
    } else if (waitStatus['missing?']) {
      finished = true
      cli.warn('This cluster could not be found.')
    } else {
      checked = true
      process.stdout.write('\r ${cli.color.blue(waitStatus.message)} ' + s.next())
      yield sleep(500)
    }
  }
}

module.exports = {
  topic: 'kafka',
  command: 'wait',
  description: 'waits until Kafka is ready to use',
  args: [
    { name: 'CLUSTER', optional: true }
  ],
  help: `
    Waits until Kafka is ready to use.

    Examples:

    $ heroku kafka:wait
    $ heroku kafka:wait HEROKU_KAFKA_BROWN_URL
`,
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(kafkaWait))
}
