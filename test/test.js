var amdextract = require('..');
var should = require('should');
var fs = require('fs');

function read(testName) {
  return fs.readFileSync('test/fixtures/' + testName + '.js').toString();
};

function parse(testName, options) {
  return amdextract.parse(read(testName), options);
};

describe('amdextract', function() {
  describe('#parse()', function() {
    describe('unnamed module', function() {
      describe('without paths', function() {
        var source = "define(function() {})";
        var output = amdextract.parse(source, { removeUnusedDependencies: true });
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal(undefined); });
        it('.paths', function() { result.paths.should.be.empty; });
        it('.dependencies', function() { result.dependencies.should.be.empty; });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql([]); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql([]); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(source); });
      });

      describe('with paths', function() {
        var output = amdextract.parse(
          "define(['p'], function(a) {})",
          { removeUnusedDependencies: true }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal(undefined); });
        it('.paths', function() { result.paths.should.be.eql(['p']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql(['p']); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql(['a']); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define([], function() {})"
        ); });
      });
    });

    describe('named module', function() {
      describe('all paths are unused', function() {
        var output = amdextract.parse(
          "define('name', ['p1', 'p2'], function(a, b) {})",
          { removeUnusedDependencies: true }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a', 'b']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql(['p1', 'p2']); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql(['a', 'b']); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define('name', [], function() {})"
        ); });
      });

      describe('some paths are unused', function() {
        var output = amdextract.parse(
          "define('name', ['p1', 'p2'], function(a, b) { return b; })",
          { removeUnusedDependencies: true }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a', 'b']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql(['p1']); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql(['a']); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define('name', ['p2'], function(b) { return b; })"
        ); });
      });

      describe('all paths are used', function() {
        var output = amdextract.parse(
          "define('name', ['p1', 'p2'], function(a, b) { return b.concat(a); })",
          { removeUnusedDependencies: true }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a', 'b']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql([]); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql([]); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define('name', ['p1', 'p2'], function(a, b) { return b.concat(a); })"
        ); });
      });

      describe('all paths are unused except three', function() {
        var output = amdextract.parse(
          "define('name', ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'], function(a, b, c, d, e, f, g, h) { return d.concat(g); })",
          { removeUnusedDependencies: true }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql(['p1', 'p2', 'p3', 'p5', 'p6', 'p8']); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql(['a', 'b', 'c', 'e', 'f', 'h']); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define('name', ['p4', 'p7'], function(d, g) { return d.concat(g); })"
        ); });
      });

      describe('number of paths is grater than number of variables', function() {
        var output = amdextract.parse(
          "define('name', ['p1', 'p2'], function(a) { return a; })",
          { removeUnusedDependencies: true }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql(['p2']); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql([]); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define('name', ['p1'], function(a) { return a; })"
        ); });
      });

      describe('number of variables is grater than number of paths', function() {
        var output = amdextract.parse(
          "define('name', ['p1', 'p2'], function(a, b, c) { return a; })",
          { removeUnusedDependencies: true }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a', 'b', 'c']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql(['p2']); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql(['b', 'c']); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define('name', ['p1'], function(a) { return a; })"
        ); });
      });

      describe('when specifying exceptsPaths in options only', function() {
        var output = amdextract.parse(
          "define('name', ['p1', 'p2'], function(a) { return a; })",
          { removeUnusedDependencies: true, exceptsPaths: ['p2'] }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql([]); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql([]); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define('name', ['p1', 'p2'], function(a) { return a; })"
        ); });
      });

      describe('comments between paths or dependencies', function() {
        var output = amdextract.parse(
          "define('name', ['p1', /**/ 'p2', 'p3' /**/, /**/ 'p4' /**/, /**/ 'p5' /**/], function(a, b, c, d) { return a.concat(d); })",
          { removeUnusedDependencies: true }
        );
        var result = output.results[0];
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2', 'p3', 'p4', 'p5']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a', 'b', 'c', 'd']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql(['p2', 'p3', 'p5']); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql(['b', 'c']); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(
          "define('name', ['p1', /**/ 'p4' /**/], function(a, d) { return a.concat(d); })"
        ); });
      });

      describe('general test', function() {
        var output = parse('sample', { removeUnusedDependencies: true, exceptsPaths: ['t1', /^m/] });
        var result = output.results[0];
        var optimizedContent = read('sample-optimized');
        it('.moduleId', function() { should(result.moduleId).equal('name'); });
        it('.paths', function() { result.paths.should.be.eql(['p1', 'p2', 'p3', 'p4', 'p5', 't1', 'm1', 'm2']); });
        it('.dependencies', function() { result.dependencies.should.be.eql(['a', 'b', 'c', 'd']); });
        it('.unusedPaths', function() { result.unusedPaths.should.be.eql(['p1', 'p5']); });
        it('.unusedDependencies', function() { result.unusedDependencies.should.be.eql(['a']); });
        it('.optimizedContent', function() { should(output.optimizedContent).be.equal(optimizedContent); });
      });
    });
  });
});
