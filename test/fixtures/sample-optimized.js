// General test for all cases.

/* exceptsPaths: p3 */
define('name', ["p2", "p3"], function (b, c) {
    /**
     * a.fetch() must not be encountered as code.
     */
    b.fetch();
    // c.fetch() must not be encountered as code.
});
