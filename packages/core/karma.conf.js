var properties = null;
var originalConfigFn = require('../../karma.conf.js');
originalConfigFn({ set: function (arg) { properties = arg; } });

// alter settings here:
properties.coverageIstanbulReporter.dir = require('path').join(__dirname, '../../coverage/core');
properties.junitReporter.outputDir = require('path').join(__dirname, '../../test-reports/core');

// export settings
module.exports = function (config) {
    config.set(properties);
};