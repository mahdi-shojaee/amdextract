# amdextract

Extracts AMD modules, their parts and an optimized output without unused dependencies.

## example

source.js  
``` js
define(["view/a", "view/b"], function (a, b) {
	var t = new a();
});

define(["view/a", "view/b", "view/c"], function (a, b, c) {
	b.fetch();
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

define(["view/a"], function (a) {
	var t = new a();
});

define(["view/b"], function (b) {
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
This property is available when option `removeUnusedDependencies` is true.

## Release History
 * 2014-01-13   v0.1.0   Works on files with multiple modules. Can detect module id if provided. Can remove unused dependencies. Add the new `exceptsPaths` option. Options `excepts` and `exceptsPaths` can take RegExps.
 