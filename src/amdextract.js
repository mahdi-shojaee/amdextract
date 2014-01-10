/*
 * amdextract
 * https://github.com/mehdishojaei/amdextract
 *
 * Copyright (c) 2013 Mehdi Shojaei
 * Licensed under the MIT license.
 */

'use strict';

var getModuleBody = function (text) {
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
	text = text.replace(/(?:\/\*[^]*?\*\/)|(?:\/\/[^]*?$)/gm, function (match) {
		comments.push(match);
		return '';
	});

	return { source: text, comments: comments };
},

findUseage = function (variable, text) {
	variable = variable.replace('$', '\\$');

	var validChars = '(?:[^A-Za-z0-9_\\$"\']|^|$)',
		pattern = validChars + variable + validChars,
		regExp = new RegExp(pattern);

	return !!regExp.exec(text);
};

module.exports.parse = function (content, options) {
	options.excepts = Array.isArray(options.excepts) ? options.excepts : [];
	var results = [];
	
	var output = content.replace(/define\s*\(\s*(?:['"](.*)['"]\s*,\s*)?(?:\[\s*([^]*?)\s*\]\s*,)?\s*function\s*\(\s*([^]*?)\s*\)\s*\{/gm,
		function (match, moduleId, pathsStr, dependenciesStr, offset) {
		var text = content.substr(offset + match.length - 1), // Unprocessed
			paths,
			dependencies,
			unusedDependencies = [],
			unusedPaths = [],
			body, // Module body with comments
			source, // Module body without comments
			comments; // Array of inline and block comments

		paths = pathsStr ? pathsStr.split(/\s*,\s*/) : [];
		dependencies = dependenciesStr ? dependenciesStr.split(/\s*,\s*/) : [];

		if (paths && dependencies && text) {
			body = getModuleBody(text);

			if (body) {
				var rcResult = removeComments(body);

				if (rcResult) {
					source = rcResult.source;
					comments = rcResult.comments;

					unusedDependencies = dependencies.filter(function (dependency) {
						return options.excepts.indexOf(dependency) < 0 && !findUseage(dependency, source);
					});

					unusedPaths = unusedDependencies.map(function (dependency) {
						return paths[dependencies.indexOf(dependency)];
					});

					results.push({
						moduleId: moduleId,
						paths: paths,
						dependencies: dependencies,
						unusedPaths: unusedPaths,
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

			match = match.replace(pathsStr, usedPaths.join(', ')).replace(dependenciesStr, usedDependencies.join(', '));
		}

		return match;
	});

	var result = {
		results: results
	};

	if (options.removeUnusedDependencies) {
		result.contentWithoutUnusedDependencies = output;
	}

	return result;
};
