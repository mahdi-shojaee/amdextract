/*
 * amdextract
 * https://github.com/mehdishojaei/amdextract
 *
 * Copyright (c) 2013 Mehdi Shojaei
 * Licensed under the MIT license.
 */

'use strict';

var esprima = require('esprima'),
    estraverse = require('estraverse');

var toString = Object.prototype.toString,
    ArrayProto = Array.prototype;

function traverse(object, visitor) {
  var key, child,
      result = visitor(object);

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

function getModules(parsedCode) {
  var modules = [],
      comments = parsedCode.comments,
      tokens = parsedCode.tokens;

  traverse(parsedCode, function(object) {
    if (object.type === 'ExpressionStatement') {
      var expression = object.expression;

      if (expression.type === 'CallExpression' && expression.callee &&
          expression.callee.type === 'Identifier' && expression.callee.name === 'define') {
        expression.callee = estraverse.attachComments(expression.callee, comments, tokens);

        var module = {},
          leadingComments = expression.callee.leadingComments,
          exceptsPaths = [],
          id, paths, pathsIndex, callback, callbackIndex;

        if (leadingComments) {
          leadingComments.forEach(function(leadingComment) {
            var matches = /^\s*exceptsPaths\s*:\s*(\w+(?:\s*,\s*\w+)*)\s*$/m.exec(leadingComment.value);

            if (matches) {
              Array.prototype.push.apply(exceptsPaths, matches[1].split(/\s*,\s*/));
            }
          });
        }

        module.exceptsPaths = exceptsPaths;

        id = expression.arguments[0];

        if (id && id.type === 'Literal') {
          module.id = id;
        }

        pathsIndex = module.id ? 1 : 0;
        paths = expression.arguments[pathsIndex];

        if (paths && paths.type === 'ArrayExpression') {
          module.paths = paths.elements;
        }

        callbackIndex = pathsIndex + 1;
        callback = expression.arguments[callbackIndex];

        if (callback && callback.type === 'FunctionExpression') {
          module.dependencies = callback.params;
          module.body = callback.body;
        }

        modules.push(module);
      }
    }
  });

  return modules;
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

      // Do not traverse function body.
      return false;
    } else if (object.type === 'Identifier' && object.name === variable &&
        object.key !== 'property' && object.key !== 'id') {
      return object;
    }
  });
}

function extendRange(range, source) {
  var regEx = /[\s,]/,
      start = range[0] - 1,
      end = range[1],
      commaVisited = false;

  for (var char = source[start]; regEx.test(char); char = source[--start]) {
    if (char === ',') {
      commaVisited = true;
    }
  }

  if (!commaVisited) {
    for (var char = source[end]; regEx.test(char); char = source[++end])
      ;
  }

  return [start + 1, end];
}

function optimizeContent(content, rangesToRemove) {
  if (!rangesToRemove) {
    return content;
  }

  var output = '',
      start = 0;

  rangesToRemove.forEach(function(range) {
    range = extendRange(range, content);

    if (range[0] > start) {
      var tmp = content.substring(start, range[0]);

      if (/[[(]/.test(output[output.length - 1])) {
        tmp = tmp.replace(/^[,\s]*/, '');
      }

      output += tmp;
    }

    start = range[1];
  });

  output += content.substring(start);
  return output;
}

function isString(obj) {
  return toString.call(obj) === "[object String]";
}

function isRegExp(obj) {
  return toString.call(obj) === "[object RegExp]";
}

function isException(exceptions, item) {
  return exceptions.some(function (exception) {
    if (isString(exception)) {
      return exception === item;
    } else if (isRegExp(exception)) {
      return exception.test(item);
    }
  });
}

module.exports.parse = function (content, options) {
  options = options || {};
  options.excepts = Array.isArray(options.excepts) ? options.excepts : [];
  options.exceptsPaths = Array.isArray(options.exceptsPaths) ? options.exceptsPaths : [];

  var parsedCode = esprima.parse(content, { range: true, comment: true, tokens: true }),
      modules = getModules(parsedCode),
      result = {},
      ranges;

  result.results = modules.map(function(module) {
    var moduleId = module.id,
        paths = module.paths || [],
        dependencies = module.dependencies || [],
        unusedPaths,
        unusedDependencies,
        excepts = options.excepts,
        exceptsPaths = module.exceptsPaths.concat(options.exceptsPaths);

    unusedDependencies = dependencies.filter(function(dependency, index) {
      return !isException(excepts, dependency.name) &&
             (index >= paths.length || !isException(exceptsPaths, paths[index].value)) &&
             !findUseage(dependency.name, module.body);
    });

    unusedPaths = unusedDependencies.map(function(dependency) {
      return paths[dependencies.indexOf(dependency)];
    }).concat(paths.slice(dependencies.length)).filter(function(path) {
      return path && !isException(exceptsPaths, path.value);
    });

    if (options.removeUnusedDependencies) {
      ranges = [];
      ArrayProto.push.apply(ranges, unusedPaths.map(function(path) { return path.range; }));
      ArrayProto.push.apply(ranges, unusedDependencies.map(function(dependency) { return dependency.range; }));
    }

    return {
      moduleId: moduleId ? moduleId.value : void 0,
      paths: paths.map(function(path) { return path.value; }),
      dependencies: dependencies.map(function(dep) { return dep.name; }),
      unusedPaths: unusedPaths.map(function(path) { return path.value; }),
      unusedDependencies: unusedDependencies.map(function(dep) { return dep.name; })
    };
  });

  if (options.removeUnusedDependencies) {
    result.optimizedContent = optimizeContent(content, ranges);
  }

  return result;
};
