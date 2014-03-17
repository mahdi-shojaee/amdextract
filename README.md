# amdextract [![Build Status](https://travis-ci.org/mehdishojaei/amdextract.png)](https://travis-ci.org/mehdishojaei/amdextract)

Extracts AMD modules, their parts and an optimized output without unused dependencies.

## example

source.js
``` js
define("module1", ["view/a", "view/b"], function (a, b) {
	var t = new a();
});

define("module2", ["view/a", "view/b", "view/c"], function (a, b, c) {
	var t = b;
});
```

example.js
``` js
var fs = require('fs');
var amdextract = require('amdextract');

var content = fs.readFileSync('source.js');
var result = amdextract.parse(content);

console.log(result.results.length + ' modules detected.');

result.results.forEach(function (r) {
	console.log('Unused paths: ' + r.unusedPaths.join(', '));
});

console.log('\nOptimized output:');
console.log(result.optimizedContent);
```

coutput
``` console
2 modules detected.
Unused paths: view/b
Unused paths: view/a, view/c

Optimized output:

define("module1", ["view/a"], function (a) {
	var t = new a();
});

define("module2", ["view/b"], function (b) {
	var t = b;
});
```

# methods

## parse(content[, options])

### content
Type: string
JavaScript source for parsing.

### options

#### excepts
Type: Array
Default value: []

An array of strings or RegExps that represent dependency names that should not take into account.

#### exceptsPaths
Type: Array
Default value: []

An array of strings or RegExps that represent dependency paths that should not take into account.

NOTE: `exceptsPaths` can also be declared before each module definition as a comment of strings of module paths separated by commas. This only applies on the underlying module definition.

``` js
/* exceptsPaths: view/c */
define(["view/a", "view/b", "view/c"], function (a, b, c) {
	b.fetch();
});
```

#### removeUnusedDependencies
Type: Boolean
Default value: false

Removes unused dependencies from `content` and returns optimized content as `optimizedContent` property of result.

### returns

Returns an object with the following properties:

#### results
Type: Array

An array of hash objects witch have this properties for each AMD module detected in `content`:

- `moduleId`
- `paths`
- `dependencies`
- `unusedPaths`
- `unusedDependencies`
- `bodyWithComments`
- `bodyWithoutComments`
- `comments`

#### optimizedContent
Type: String

Optimized `content` (original content without unused dependencies).
This property is available when the value of option `removeUnusedDependencies` is true.

## Release History
 * 2014-03-17   v1.0.1   Update README.md.
 * 2014-03-16   v1.0.0   First release.
 * 2014-03-16   v0.1.6   Fix a bug related to unused paths.
 * 2014-03-15   v0.1.5   Add the ability to parse empty modules.
 * 2014-03-06   v0.1.3   Detects paths without corresponding dependency as unused.
 * 2014-03-06   v0.1.2   Dependency quotes in `optimizedContent` will be same as the original source.
 * 2014-01-20   v0.1.1   `exceptsPaths` can also be defined before each module definition.
 * 2014-01-13   v0.1.0   Works on files with multiple modules. Can detect module id if provided. Can remove unused dependencies. Add the new `exceptsPaths` option. Options `excepts` and `exceptsPaths` can take RegExps.
