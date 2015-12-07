'use strict';

require('chai').should();
var PartitionPlan = require('../commands/partition_plan').PartitionPlan;
var checkValidTopicName = require('../commands/shared').checkValidTopicName;
var checkValidTopicNameForDeletion = require('../commands/shared').checkValidTopicNameForDeletion;
var index = require('../index.js');

describe('PartitionPlan', function () {
  it('plans have the right number of partitions', function () {
    var plan = PartitionPlan.fromBrokers([1,2,3,4], 5)
    Object.keys(plan).length.should.equal(5);
  });

  it('plans always include correct broker ids with 1 broker', function () {
    var brokers = [0];
    var plan = PartitionPlan.fromBrokers(brokers, 10);
    var partitionZeroPlan = plan['0'];
    for (var i = 0; i < partitionZeroPlan.length; i++) {
      brokers.should.include(partitionZeroPlan[i]);
    }
  });

  it('plans always include correct broker ids with 3 brokers', function () {
    var brokers = [0,1,2];
    var plan = PartitionPlan.fromBrokers(brokers, 10);
    var partitionZeroPlan = plan['0'];
    for (var i = 0; i < partitionZeroPlan.length; i++) {
      brokers.should.include(partitionZeroPlan[i]);
    }
  });

  it('plans always include correct broker ids with 5 brokers', function () {
    var brokers = [0,1,2,3,4];
    var plan = PartitionPlan.fromBrokers(brokers, 10);
    var partitionZeroPlan = plan['0'];
    for (var i = 0; i < partitionZeroPlan.length; i++) {
      brokers.should.include(partitionZeroPlan[i]);
    }
  });

  it('planned partitions always have 1 replicas when 1 broker is in the cluster', function () {
    var brokers = [0];
    var plan = PartitionPlan.fromBrokers(brokers, 10);
    for (var i = 0; i < plan.length; i++) {
      plan[i].length.should.equal(1)
    }
  });


  it('planned partitions always have 3 replicas when 5 brokers are in the cluster', function () {
    var brokers = [0,1,2,3,4];
    var plan = PartitionPlan.fromBrokers(brokers, 10);
    for (var i = 0; i < plan.length; i++) {
      plan[i].length.should.equal(3)
    }
  });
});

describe('checkValidTopicName', function () {
  it('_, -, . and alphanumerics are allowed', function () {
    checkValidTopicName('_-.aAzZ09', []).invalid.should.equal(false);
  });

  it('empty topics are invalid', function () {
    checkValidTopicName('', []).invalid.should.equal(true);
  });

  it('topics can\'t be "."', function () {
    checkValidTopicName('.', []).invalid.should.equal(true);
  });

  it('topics can\'t be ".."', function () {
    checkValidTopicName('..', []).invalid.should.equal(true);
  });

  it('topics must be under 255 chars', function () {
    checkValidTopicName('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', []).invalid.should.equal(true);
  });

  it('topics must be ascii alphanumeric', function () {
    checkValidTopicName('+++', []).invalid.should.equal(true);
  });

  it('topics are invalid if they match an existing topic\'s name', function () {
    checkValidTopicName('page_visits', ['page_visits']).invalid.should.equal(true);
  });
});

describe('checkValidTopicNameForDeletion', function () {
  it('existing non admin topics are allowed', function () {
    checkValidTopicNameForDeletion('page_visits', ['page_visits']).invalid.should.equal(false);
  });

  it('non existing topics are not allowed', function () {
    checkValidTopicNameForDeletion('page_visits', []).invalid.should.equal(true);
  });

  it('__consumer_offsets cannot be deleted', function () {
    checkValidTopicNameForDeletion('__consumer_offsets', ['__consumer_offsets']).invalid.should.equal(true);
  });
});

describe('commands', function () {
  index.commands.forEach(function(command) {
    it(`${command.topic}:${command.command} takes a CLUSTER argument`, function () {
      command.args.map(function (arg) { return arg.name; }).should.include('CLUSTER');
    });
  });
});
