'use strict';

let validTopicRegex = /^[a-zA-Z0-9\\._\\-]+$/

function collidesWithExistingTopics(topicName, existingTopics) {
  var replaced = topicName.replace(/\./g, '_');
  for (var i = 0; i < existingTopics.length; i++) {
    if (replaced === existingTopics[i].replace(/\./g, '_')) {
      return true;
    }
  }
  return false;
}

function checkValidTopicName(topicName, existingTopics) {
  if (topicName.length <= 0) {
    return {invalid: true, message: "length must be greater than 0"};
  } else if (topicName === "." || topicName === "..") {
    return {invalid: true, message: "topic name must not be '.' or '..'"};
  } else if (topicName.length > 255) {
    return {invalid: true, message: "topic names can't be longer than 255 chars"};
  } else if (!topicName.match(validTopicRegex)) {
    return {invalid: true, message: "topic name contains characters other than ASCII alphanumerics, '.', '_', and '-'"};
  } else if (collidesWithExistingTopics(topicName, existingTopics)) {
    return {invalid: true, message: "topic name collids with existing topics"};
  } else {
    return {invalid: false};
  }
};

module.exports = {
  checkValidTopicName : checkValidTopicName
}
