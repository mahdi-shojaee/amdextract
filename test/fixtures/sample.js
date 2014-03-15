define('test1', ['p1', 'p2'], function(a, b) {
});

define('test2', ['p1', 'p2'], function(a, b) {
  return b;
});

define('test3', ['p1', 'p2'], function(a, b) {
  var c = b;
  return c;
});

define('test4', ['p1', 'p2'], function(a, b) {
  return b.from(a);
});

define('test5', ['p1', 'p2'], function(a) {
  return a;
});

define('test5', ['p1', 'p2'], function(a) {
  return a;
});
