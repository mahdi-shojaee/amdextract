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
commaRegExp = /(\s*),(\s*)/,

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
},

splitByComma = function (str) {
  var result = [],
      parts = str.split(commaRegExp),
      tokensLength = (parts.length + 2) / 3;

  for (var i = 0; i < tokensLength; i++) {
    var index = 3 * i;
    result.push({
      before: parts[index - 1],
      token: parts[index],
      after: parts[index + 1]
    });
  }

  return result;
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
        exceptsPaths = options.exceptsPaths,
        excepts = options.excepts,
        body, // Module body with comments
        source, // Module body without comments
        comments; // Array of inline and block comments

    if (exceptsPathsStr) {
      exceptsPaths = options.exceptsPaths.concat(splitByComma(exceptsPathsStr).map(function (p) { return p.token; }));
    }

    commentlessPathsStr = removeComments(pathsStr).source;
    commentlessDependenciesStr = removeComments(dependenciesStr).source;

    paths = commentlessPathsStr ? splitByComma(commentlessPathsStr).map(function (p) {
      return {
        path: p.token.substr(1, p.token.length - 2),
        quote: p.token[0],
        before: p.before,
        after: p.after
      };
    }) : [];

    dependencies = commentlessDependenciesStr ? splitByComma(commentlessDependenciesStr) : [];

    if (text) {
      body = getModuleBody(text);
      var rcResult = removeComments(body);

      if (rcResult) {
        source = rcResult.source;
        comments = rcResult.comments;

        unusedDependencies = dependencies.filter(function (dependency) {
          var index = dependencies.indexOf(dependency);
          return !isException(excepts, dependency.token) &&
                 (index >= paths.length || !isException(exceptsPaths, paths[index].path)) &&
                 !findUseage(dependency.token, source);
        });

        unusedPaths = unusedDependencies.map(function (dependency) {
          var index = dependencies.indexOf(dependency);
          return index < paths.length ? paths[index] : void 0;
        }).concat(paths.slice(dependencies.length)).filter(function(p) {
          return p && !isException(exceptsPaths, p.path);
        });

        results.push({
          moduleId: moduleId,
          paths: paths.map(function (p) { return p.path; }),
          unusedPaths: unusedPaths.map(function (p) { return p.path; }),
          dependencies: dependencies.map(function (d) { return d.token; }),
          unusedDependencies: unusedDependencies.map(function (d) { return d.token; }),
          bodyWithComments: body,
          bodyWithoutComments: source,
          comments: comments
        });
      }
    }

    if (options.removeUnusedDependencies) {
      var usedDependencies = dependencies.filter(function (dependency) {
        return unusedDependencies.indexOf(dependency) < 0;
      });

      var usedPaths = paths.filter(function (dependency) {
        return unusedPaths.indexOf(dependency) < 0;
      });

      match = match.replace(pathsStr, usedPaths.map(function (p, index, array) {
          var before = (index === 0 || !p.before) ? '' : p.before;
          var after = (index === array.length || !p.after) ? '' : p.after;
          return before + p.quote + p.path + p.quote + after;
        }).join(','))
        .replace(dependenciesStr, usedDependencies.map(function (d, index, array) {
          var before = (index === 0 || !d.before) ? '' : d.before;
          var after = (index === array.length || !d.after) ? '' : d.after;
          return before + d.token + after;
        }).join(','));
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
