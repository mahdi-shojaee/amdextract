define(function() {
});

define(['path'], function(a) {
});

define('test1', ['a-path', 'b-path'], function(a, b) {
});

define('test2', ['a-path', 'b-path'], function(a, b) {
  return b;
});

define('test3', ['a-path', 'b-path'], function(a, b) {
  var c = b;
  return c;
});

define('test4', ['a-path', 'b-path'], function(a, b) {
  return b.from(a);
});

define('test5', ['a-path', 'b-path'], function(a) {
  return a;
});
