// General test for all cases.

/* exceptsPaths: p3 */
define('name', ["p2"
  , 'p3', 'p4',  "t1"  , 'm1'

  ,



  'm2'], function (b
    ,  c, d) {
    /**
     * a.fetch() must not be encountered as code.
     */

    // c.fetch() must not be encountered as code.

    b.a();

    function test1(a) {
      return a;
    }

    function test2() {
      function test3(a) {
        return a;
      }
    }

    function test4() {
      function test5() {
        return d;
      }
    }

    var result = (function(a) {
      return a;
    })(b);

    var result = (function(a) {
      return (function(a) {
        return a;
      })(a);
    })(b);

    var regEx = /\/download\//i;
});
