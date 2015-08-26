'use strict';

let PartitionPlan = {
  fromBrokers: function(brokers, partitionCount) {
    let out = {};
    let startIndex = Math.round(Math.random() * brokers.length) + 1;
    var currentPartitionId = 0;
    var nextReplicaShift = Math.round(Math.random() * brokers.length) + 1;
    var replicationFactor = this.computeReplicationFactor(brokers);

    for (var i = 0; i < partitionCount; i++) {
      if (currentPartitionId > 0 && (currentPartitionId % brokers.length == 0)) {
        nextReplicaShift += 1;
      }
      let firstReplicaIndex = (currentPartitionId + startIndex) % brokers.length;
      let replicaList = [brokers[firstReplicaIndex]];
      for (var j = 0; j < replicationFactor -1; j++) {
        replicaList.push(this.replicaIndex(firstReplicaIndex, nextReplicaShift, j, brokers.length));
      }
      out[currentPartitionId] = replicaList.reverse();
      currentPartitionId += 1;
    }

    return out;
  },
  replicaIndex: function (firstReplicaIndex, secondReplicaShift, replicaIndex, nBrokers) {
    let shift = 1 + (secondReplicaShift + replicaIndex) % (nBrokers - 1);
    return (firstReplicaIndex + shift) % nBrokers;
  },
  computeReplicationFactor: function (brokers) {
    if (brokers.length >= 3) {
      return 3;
    } else {
      return 1;
    }
  }
};

module.exports = {
  PartitionPlan : PartitionPlan
};
