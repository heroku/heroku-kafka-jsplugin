'use strict'

let cli = require('heroku-cli-util')
let co = require('co')
let withCluster = require('../lib/clusters').withCluster
let request = require('../lib/clusters').request

const VERSION = 'v0'

function colorize(s, color) {
  if (color === 'green') {
    return cli.color.green(s)
  } else if (color === 'red') {
    return cli.color.red(s)
  } else if (color === 'yellow') {
    return cli.color.yellow(s)
  } else {
    return s
  }
}

function * diagnose (context, heroku) {
  yield withCluster(heroku, context.app, context.args.CLUSTER, function * (addon) {
    let diagnoseResult = yield request(heroku, {
      path: `/client/kafka/${VERSION}/clusters/${addon.name}/diagnose`
    })
    for (var key in diagnoseResult) {
      var diagnose = diagnoseResult[key]

      cli.log(colorize(`${diagnose.name} : ${diagnose.status}`, diagnose.status))
      cli.log()
      if (diagnose.status !== 'green') {
        cli.table(diagnose.table,
          {
            columns: diagnose.table_headers.map((h) => { return {key: h, label: h} })
          }
        )
        cli.log()
        cli.log(diagnose.description)
      }
    }
  })
}

let cmd = {
  topic: 'kafka',
  command: 'diagnose',
  description: '',
  help: `
    Lists available Kafka topics.

    Examples:

    $ heroku kafka:diagnose
    $ heroku kafka:diagnose HEROKU_KAFKA_BROWN_URL
`,

  args: [
    { name: 'CLUSTER', optional: true }
  ],
  needsApp: true,
  needsAuth: true,
  run: cli.command(co.wrap(diagnose))
}

module.exports = {
  cmd
}
