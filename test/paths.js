var fs = require('fs');
var extract = require('../');

var unused = fs.readFileSync('test/fixtures/paths.js').toString();

exports.extractsPaths = function(test) {
  var result = extract.parse(unused).results[0];
  test.deepEqual(result.paths, ['jquery', 'other', 'unused']);
  test.done();
};

exports.reportsUnusedPaths = function(test) {
  var result = extract.parse(unused).results[0];
  test.deepEqual(result.unusedPaths, ['jquery', 'unused']);
  test.done();
};

exports.extractsDependencies = function(test) {
  var result = extract.parse(unused).results[0];
  test.deepEqual(result.dependencies, ['$', 'other']);
  test.done();
};

exports.reportsUnusedDependencies = function(test) {
  var result = extract.parse(unused).results[0];
  test.deepEqual(result.unusedDependencies, ['$']);
  test.done();
};
