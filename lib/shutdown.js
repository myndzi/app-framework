'use strict';

var Promise = require('bluebird'),
    stream = require('stream');

module.exports = function (app) {
    var EXIT_CODES = require('./exit-codes');
    
    app.restart = function (msg, timeout) { return app.shutdown(EXIT_CODES.RELOAD, msg, timeout); };
    app.shutdown = function (/*[code], [msg], [timeout]*/) { // jshint maxstatements: 22, maxcomplexity: 8
        var i = arguments.length, args = new Array(i);
        while (i--) { args[i] = arguments[i]; }
        
        var code = EXIT_CODES.UNKNOWN, msg = 'unknown', timeout = null;
        
        if (typeof args[0] === 'number') { code = args.shift(); }
        if (typeof args[0] !== 'number') { msg = args.shift(); }
        if (typeof args[0] === 'number') { timeout = args.shift(); }
        
        if (timeout === null) { timeout = app.config.get('app.shutdownTimeout') || null; }
        
        app.emit('before shutdown', code, msg, timeout);
        
        var promises = [ ],
            listeners = app.listeners('shutdown');
        
        function makePromise(arg) {
            if (typeof stream.once === 'function') {
                return new Promise(function (resolve, reject) {
                    stream.once('error', reject);
                    stream.once('end', resolve);
                    stream.once('close', resolve);
                });
            }
            if (typeof arg.then === 'function') {
                return arg;
            }
            if (typeof arg === 'function') {
                return Promise.promisify(arg)();
            }
            if (arg instanceof Error) {
                return Promise.reject(arg);
            }
            return Promise.resolve(arg);
        }
        
        // allow events to register async completion
        listeners.forEach(function (handler) {
            var ret, err;
            
            try {
                ret = handler.call(app, function await(arg) {
                    promises.push(makePromise(arg));
                });
                if (ret !== void 0) {
                    promises.push(makePromise(ret));
                }
            } catch (e) {
                if (!(e instanceof Error)) { err = new Error(e); }
                else { err = e; }
                
                err.message = 'Shutdown handler threw: ' + err.message;
                promises.push(Promise.reject(err));
            }
        });

        var cleanupHandlers = Promise.all(promises.map(function (promise) {
            return promise.reflect();
        }));
        
        var shutdownErrors = cleanupHandlers.then(function (results) {
            return results.filter(function (promise) {
                return promise.isRejected();
            }).map(function (promise) {
                return promise.reason();
            });
        });
        
        return new Promise(function (resolve) {
            var timer;
            if (!isNaN(parseInt(timeout, 10))) {
                timer = setTimeout(resolve.bind(null, null), timeout);
            }
            shutdownErrors.then(function (res) {
              clearTimeout(timer);
              resolve(res);
            });
        }).then(function (result) {
            if (result === null) {
                app.emit('after shutdown', {
                    code: code,
                    cleanupHandlers: promises
                });
                return EXIT_CODES.SHUTDOWN_TIMEOUT_EXCEEDED;
            }
            
            result = {
                code: code,
                errors: result
            };
            
            app.emit('after shutdown', result);
            return result.code;
        });
    };
};
