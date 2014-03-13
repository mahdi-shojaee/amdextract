/*
 * amdextract
 * https://github.com/mehdishojaei/amdextract
 *
 * Copyright (c) 2013 Mehdi Shojaei
 * Licensed under the MIT license.
 */

'use strict';

var defineRegExp = /(?:\/[\*\/]\s*exceptsPaths\s*\:\s*([^]+?)\s*(?:(?:\*\/)|(?:[\r\n]+)))?\s*define\s*\(\s*(?:['"](.*)['"]\s*,\s*)?(?:\[\s*([^]*?)\s*\]\s*,)?\s*function\s*\(\s*([^]*?)\s*\)\s*\{/gm,
commentRegExp = /(?:\/\*[^]*?\*\/)|(?:\/\/[^]*?$)/gm,
commaRegExp = /\s*,\s*/,

getModuleBody = function (text) {
  for (var i = 0, counter = 0, len = text.length; i < len; ++i) {
    if (text[i] === '{') {
      ++counter;
    } else if (text[i] === '}') {
      --counter;
    }
    if (!counter) {
      break;
    }
  }
  return text.substring(1, i);
},

removeComments = function (text) {
  var comments = [];
  if (text) {
    text = text.replace(commentRegExp, function (match) {
      comments.push(match);
      return '';
    });
  }
  return { source: text, comments: comments };
},

findUseage = function (variable, text) {
  variable = variable.replace('$', '\\$');
  var invalidChars = '(?:[^A-Za-z0-9_\\$"\']|^|$)',
    pattern = invalidChars + variable + invalidChars,
    regExp = new RegExp(pattern);
  return regExp.test(text);
},

toString = Object.prototype.toString,

isString = function (obj) {
  return toString.call(obj) === "[object String]";
},

isRegExp = function (obj) {
  return toString.call(obj) === "[object RegExp]";
},

isException = function (exceptions, dependency) {
  return exceptions.some(function (exception) {
    if (isString(exception)) {
      return exception === dependency;
    } else if (isRegExp(exception)) {
      return exception.test(dependency);
    }
  });
};

module.exports.parse = function (content, options) {
	options = options || {};
	options.excepts = Array.isArray(options.excepts) ? options.excepts : [];
	options.exceptsPaths = Array.isArray(options.exceptsPaths) ? options.exceptsPaths : [];
	
	var results = [];

	var output = content.replace(defineRegExp, function (match, exceptsPathsStr, moduleId, pathsStr, dependenciesStr, offset) {
		var text = content.substr(offset + match.length - 1), // Unprocessed
        	paths, dependencies,
        	commentlessPathsStr, commentlessDependenciesStr,
			unusedDependencies = [],
			unusedPaths = [],
			exceptsPaths = [],
			excepts = options.excepts,
			body, // Module body with comments
			source, // Module body without comments
			comments; // Array of inline and block comments

		if (exceptsPathsStr) {
			exceptsPaths = options.exceptsPaths.concat(exceptsPathsStr.split(commaRegExp));
		}

		commentlessPathsStr = removeComments(pathsStr).source;
		commentlessDependenciesStr = removeComments(dependenciesStr).source;

		paths = commentlessPathsStr ? commentlessPathsStr.split(commaRegExp).map(function (p) {
			return {
				path: p.substr(1, p.length - 2),
				quote: p[0]
			};
		}) : [];

		dependencies = commentlessDependenciesStr ? commentlessDependenciesStr.split(commaRegExp) : [];

		if (text) {
			body = getModuleBody(text);

			if (body) {
				var rcResult = removeComments(body);

				if (rcResult) {
					source = rcResult.source;
					comments = rcResult.comments;

					unusedDependencies = dependencies.filter(function (dependency) {
					  return !isException(excepts, dependency) &&
					         !isException(exceptsPaths, paths[dependencies.indexOf(dependency)].path) &&
					         !findUseage(dependency, source);
					});

					unusedPaths = unusedDependencies.map(function (dependency) {
						return paths[dependencies.indexOf(dependency)];
					});

					results.push({
						moduleId: moduleId,
						paths: paths.map(function (p) { return p.path; }),
						unusedPaths: unusedPaths.map(function (p) { return p.path; }),
						dependencies: dependencies,
						unusedDependencies: unusedDependencies,
						bodyWithComments: body,
						bodyWithoutComments: source,
						comments: comments
					});
				}
			}
		}

		if (options.removeUnusedDependencies) {
			var usedDependencies = dependencies.filter(function (dependency) {
				return unusedDependencies.indexOf(dependency) < 0;
			});

			var usedPaths = paths.filter(function (dependency) {
				return unusedPaths.indexOf(dependency) < 0;
			});

			match = match.replace(pathsStr, usedPaths.map(function (p) { return p.quote + p.path + p.quote; }).join(', '))
			        .replace(dependenciesStr, usedDependencies.join(', '));
		}

		return match;
	});

	var result = {
		results: results
	};

	if (options.removeUnusedDependencies) {
		result.optimizedContent = output;
	}

	return result;
};
