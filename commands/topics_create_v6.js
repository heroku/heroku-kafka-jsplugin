'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _cliEngineCommand = require('cli-engine-command');

var _cliEngineCommand2 = _interopRequireDefault(_cliEngineCommand);

var _app = require('cli-engine-command/lib/flags/app');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

let appParser = function (app) {
  return new Promise(resolve => resolve(`${app}-test`));
};

class _class extends _cliEngineCommand2.default {

  async run(args) {
    this.out.log(`running create... for ${this.flags.app}`);
  }
}
exports.default = _class;
_class.topic = 'kafka';
_class.command = '_topics:create';
_class.description = 'creates a topic in Kafka';
_class.help = `
    Creates a topic in Kafka. Defaults to time-based retention according to plan
    minimum if not explicitly specified.

    Examples:

  $ heroku kafka:topics:create page-visits --partitions 100
  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --replication-factor 3 --retention-time 10d
  $ heroku kafka:topics:create page-visits kafka-shiny-2345 --partitions 100 --compaction
  `;
_class.args = [{ name: 'TOPIC' }, { name: 'CLUSTER', optional: true }];
_class.flags = {
  app: (0, _app.AppFlag)({ required: true, parse: appParser }),
  partitions: (0, _cliEngineCommand.StringFlag)({ description: 'number of partitions to give the topic' }),
  'replication-factor': (0, _cliEngineCommand.StringFlag)({ description: 'number of replicas the topic should be created across' }),
  'retention-time': (0, _cliEngineCommand.StringFlag)({ description: 'length of time messages in the topic should be retained (at least 24h)' }),
  compaction: (0, _cliEngineCommand.BooleanFlag)({ description: 'whether to use compaction for this topic' })
};