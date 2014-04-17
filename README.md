# amdextract [![Build Status](https://travis-ci.org/mehdishojaei/amdextract.png)](https://travis-ci.org/mehdishojaei/amdextract)

Extracts AMD modules, their parts and an optimized output without unused dependencies.

## example

source.js
```js
define('module1', ['p1', 'p2'], function (a, b) {
	return a;
});

define('module2', ['p1', 'p2', 'p3', 'p4'], function (a, b, c) {
	return b;
});
```

example.js
```js
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

output
```
2 modules detected.
Unused paths: p2
Unused paths: p1, p3, p4

Optimized output:

define('module1', ['p1'], function (a) {
	return a;
});

define('module2', ['p2'], function (b) {
	return b;
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

source.js
```js
/* exceptsPaths: p3 */
define(['p1', 'p2', 'p3'], function (a, b, c) {
	return b;
});
```

optimized-source.js
```js
/* exceptsPaths: p3 */
define(['p2', 'p3'], function (b, c) {
	return b;
});
```
#### removeUnusedDependencies
Type: Boolean
Default value: false

Removes unused dependencies from `content` and returns optimized content as `optimizedContent` property of result.

#### seperator
Type: String
Default value: `' '`

Seperator to use when creating arrays of paths and modules in `define` statements in `optimizedContent` property of result. Example: 

Default (`' '`)
```js
define(['p1', 'p2', 'p3'], function (a, b, c) {
```

New line (`'\n'`)
```js
define(['p1',
'p2',
'p3'], function (a,
b,
c) {
```

NOTE: Do not include the comma in the `seperator` string.

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
 * 2014-04-09   v1.0.4   Fix a bug when dependencies length is grater than paths length.
 * 2014-03-29   v1.0.3   Fix a bug when specifying exceptsPaths in options only.
 * 2014-03-17   v1.0.0   First release.
