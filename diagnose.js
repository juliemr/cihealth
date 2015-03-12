var q = require('q');
var exec = require('child_process').exec;

var STATES = [{
    regexp: 'NoSuchWindowError',
    state: 'NoSuchWindowError'
  }, {
    regexp: 'Timed out awaiting response to command \"switchToFrame\"',
    state: 'Timed out switching frames'
  }];

var getGrepCmd = function(logFile, regexp) {
  return 'grep ' + logFile + ' --count --regexp="' + regexp + '"';
};

var tryState = function(index, logFile) {
  if (index >= STATES.length) {
    return q('other failure');
  }

  var deferred = q.defer();

  var child = exec(getGrepCmd(logFile, STATES[index].regexp),
      function(error, stdout, stderr) {
        // grep outputs error code 1 if no matches, so continue
        if (stderr || (error && error.code === 1)) {
          tryState(index + 1, logFile).then(deferred.fulfill);
        } else {
          // There were some matches
          deferred.fulfill(STATES[index].state);
        }
      });
  return deferred.promise;
}

/**
 * Given job info with a log file, attempts to figure out the status of
 * the job.
 */
exports.diagnose = function(jobInfo, logFile) {
  if (jobInfo.state === 'passed') {
    jobInfo.advancedState = 'pass';
    return q(true);
  } else {
    return tryState(0, logFile).then(function(advancedState) {
      jobInfo.advancedState = advancedState;
    });
  }
}
