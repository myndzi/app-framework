'use strict';

var PATH = require('path'),
    fs = require('fs');
    
var Promise = require('bluebird');

Promise.promisifyAll(fs, { suffix: '$' });

// load('type')([opts]) ->
// loads files in root/app/type
// if index.json is present, assumed to be an array of items to load in order
// if not, all items are loaded in undefined order
// modules are expected to be functions with the signature
// module.exports = function (app, xport[, opts...]) { }
// xport('key', 'val') sets app[type][key] = val;
// returning a value also sets app[type] = returned value
module.exports = function (type) {
    var i = arguments.length, args = new Array(i);
    while (i--) { args[i] = arguments[i]; }

    return function (app) {
        var type = args[0],
            path = app.path(type);
        
        args.shift();
        
        app[type] = { };
        
        return Promise.try(function () {
            try {
                return require(PATH.join(path, 'index.json'));
            } catch (e) {
                if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
                return fs.readdir$(path);
            }
        }).filter(function (filename) {
            return /\.js$/.test(filename);
        }).tap(function (filenames) {
            app.log.trace(['Loading ' + type + '...'].concat(filenames));
        }).each(function (filename) {
            var name = PATH.basename(filename).split('.')[0],
                file = PATH.join(path, filename);

            var exports = { },
                called = false;
            
            var xport = function (key, val) {
                called = true;
                exports[key] = val;
            };
            
            var _args = args.slice(0);
            
            _args.push(xport);
            _args.unshift(app);
            
            return Promise.try(function () {
                var module = require(file);

                return module.apply(null, _args);
            }).then(function (res) {
                if (called) {
                    app[type][name] = exports;
                } else if (res !== void 0) {
                    app[type][name] = res;
                }
                return res;
            });
        });
    };
};
