'use strict';

require('chai').should();
var PartitionPlan = require('../commands/partition_plan').PartitionPlan;

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
});
