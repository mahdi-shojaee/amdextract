/*
 * amdextract
 * https://github.com/mehdishojaei/amdextract
 *
 * Copyright (c) 2013 Mehdi Shojaei
 * Licensed under the MIT license.
 */

'use strict';

var esprima = require('esprima');


var defineRegExp = /(?:\/[\*\/]\s*exceptsPaths\s*\:\s*([^]+?)\s*(?:(?:\*\/)|(?:[\r\n]+)))?\s*define\s*\(\s*(?:['"](.*)['"]\s*,\s*)?(?:\[\s*([^]*?)\s*\]\s*,)?\s*function\s*\(\s*([^]*?)\s*\)\s*\{/gm;
var commentRegExp = /(?:[^\\](\/\*[^]*?\*\/))|(?:[^\\](\/\/.*?)$)/gm;
var commaRegExp = /(\s*),(\s*)/;

var toString = Object.prototype.toString;

function traverse(object, visitor) {
  var key, child;

  var result = visitor(object);

  if (result || result === false) {
    return result;
  }

  for (key in object) {
    if (object.hasOwnProperty(key)) {
      child = object[key];
      if (typeof child === 'object' && child !== null) {
        child.key = key;
        if (result = traverse(child, visitor)) {
          return result;
        }
      }
    }
  }

  return false;
}

function findUseage(variable, parsedCode) {
  return traverse(parsedCode, function(object) {
    if (object.type === 'FunctionExpression' || object.type === 'FunctionDeclaration') {
      var params = object.params, obj;

      if (obj = findUseage(variable, object.body)) {
        for (var i = 0, length = params.length; i < length; i++) {
          var param = params[i];
          if (param.type === obj.type && param.name === obj.name) {
            break;
          }
        }

        if (i === length) {
          return obj;
        }
      }

      return false;
    } else if (object.type === 'Identifier' && object.name === variable &&
        object.key !== 'property' && object.key !== 'id') {
      return object;
    }
  });
}

function getModuleBody(text) {
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
}

function removeComments(text) {
  var comments = [];
  if (text) {
    text = text.replace(commentRegExp, function (match, comment) {
      comments.push(comment);
      return '';
    });
  }
  return { source: text, comments: comments };
}

function isString(obj) {
  return toString.call(obj) === "[object String]";
}

function isRegExp(obj) {
  return toString.call(obj) === "[object RegExp]";
}

function isException(exceptions, dependency) {
  return exceptions.some(function (exception) {
    if (isString(exception)) {
      return exception === dependency;
    } else if (isRegExp(exception)) {
      return exception.test(dependency);
    }
  });
}

function splitByComma(str) {
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
}

module.exports.parse = function (content, options) {
  options = options || {};
  options.excepts = Array.isArray(options.excepts) ? options.excepts : [];
  options.exceptsPaths = Array.isArray(options.exceptsPaths) ? options.exceptsPaths : [];

  var results = [];

  var output = content.replace(defineRegExp, function (match, exceptsPathsStr, moduleId, pathsStr, dependenciesStr, offset) {
    var
      // Unprocessed
      text = content.substr(offset + match.length - 1),

      // Module body without comments
      source,

      paths, dependencies,
      commentlessPathsStr, commentlessDependenciesStr,
      unusedDependencies = [],
      unusedPaths = [],
      exceptsPaths = options.exceptsPaths,
      excepts = options.excepts;

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
      var rcResult = removeComments(text);

      if (rcResult) {
        source = getModuleBody(rcResult.source);
        var parsedCode = esprima.parse('function wrapper(){' + source + '}').body[0].body;

        unusedDependencies = dependencies.filter(function (dependency) {
          var index = dependencies.indexOf(dependency);
          return !isException(excepts, dependency.token) &&
                 (index >= paths.length || !isException(exceptsPaths, paths[index].path)) &&
                 !findUseage(dependency.token, parsedCode);
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
          unusedDependencies: unusedDependencies.map(function (d) { return d.token; })
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
