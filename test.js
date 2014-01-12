'use strict';
var amdextract = require('amdextract');

var result = amdextract.parse('\r\n\
define(["view/a", "view/b"], function (a, b) {\r\n\
    var t = new a();\r\n\
});\r\n\
\r\n\
define(["view/a", "view/b", "view/c"], function (a, b, c) {\r\n\
    var t = b;\r\n\
});\r\n\
', { removeUnusedDependencies: true });

console.log(result.results.length + ' modules detected.');

result.results.forEach(function (r) {
	console.log('Unused paths: ' + r.unusedPaths.join(', '));
});

console.log('\nOptimized output:');
console.log(result.optimizedContent);
