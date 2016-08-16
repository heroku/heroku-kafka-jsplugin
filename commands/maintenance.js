'use strict'


let cli = require('heroku-cli-util')
let co = require('co')
let HerokuKafkaClusters = require('./clusters.js').HerokuKafkaClusters

function * info(context, heroku, clusters) {
  let info = yield clusters.maintenanceInfo(context.args.CLUSTER);
  if (info) {
  console.log(info.message)
  } else {
    process.exit(1)
  }
}

function * run(context, heroku, clusters) {
  let runResult = yield clusters.maintenanceInfo(context.args.CLUSTER);
  if (runResult) {
  console.log(runResult.message)
  } else {
    process.exit(1)
  }
}

function * changeWindow(context, heroku, clusters, addon) {
  let changeResult = yield clusters.maintenanceInfo(context.args.CLUSTER);
  if (changeResult) {
    console.log(`Maintenance window for ${addon.name} set for ${changeResult.window}.`)
  } else {
    process.exit(1)
  }
}

function * maintenance(context, heroku) {
  var clusters = new HerokuKafkaClusters(heroku, process.env, context)
  if context.args.command === 'info' {
    yield info(context, heroku, clusters)
  } else if context.args.command == 'run' {
    yield run(context, heroku, addon)
  } else if context.args.command.startsWith('window=') {
    yield changeWindow(context, heroku, clusters, addon)
  } else {
    cli.error("Unknown command")
      process.exit(1)
  }
}

module.exports = {
  topic: 'kafka',
  command: 'maintenance',
  description: 'manage maintenance for kafka',
  help: `
    Usage: heroku kafka:maintenance <info|run|window> CLUSTER

    Manages maintenance for <CLUSTER>
    info     # show current maintenance information
    run      # start maintenance
    window=  # set weekly UTC maintenance for CLUSTER
             # e.g. `heroku kafka:maintenance window="Sunday 14:30"`

  `,
  needsApp: true,
  needsAuth: true,
  args: [
    { name: 'command', optional: false }
    { name: 'CLUSTER', optional: true }
  ],
  run: cli.command(co.wrap(maintenance))
}
