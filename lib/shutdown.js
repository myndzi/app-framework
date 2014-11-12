'use strict';

module.exports = function (app) {
    var EXIT_CODES = app.lib('constants/exit-codes');
    
    app.restart = function (msg, timeout) { return app.shutdown(EXIT_CODES.RELOAD, msg, timeout); };
    app.shutdown = function (/*[code], [msg], [timeout]*/) {
        var i = arguments.length, args = new Array(i);
        while (i--) { args[i] = arguments[i]; }
        
        var code = EXIT_CODES.UNKNOWN, msg = 'unknown', timeout = null;
        
        if (typeof args[0] === 'number') { code = args.shift(); }
        if (typeof args[0] !== 'number') { msg = args.shift(); }
        if (typeof args[0] === 'number') { timeout = args.shift(); }
        
        app.emit('before shutdown', code, msg, timeout);
        
        var promises = [ ];
        
        // allow events to register async completion
        try {
            app.emit('shutdown', function (arg) {
                if (typeof arg.then === 'function') {
                    // handler calls with promise
                    promises.push(arg);
                } else if (typeof arg === 'function') {
                    // handler calls with callback
                    promises.push(Promise.promisify(arg)());
                } else {
                    // handler lolwut?
                    app.log.warn('Shutdown: Invalid argument: ' + arg);
                }
            });
        } catch (e) {
            promises = [ Promise.reject(e) ];
        }
        
        var cleanupHandlers = Promise.settle(promises);
        var shutdownErrors = cleanupHandlers.then(function (results) {
            return results.filter(function (promise) {
                return promise.isRejected();
            }).map(function (promise) {
                return promise.reason();
            });
        });
        
        var tmp = [ shutdownErrors  ];
        if (!isNaN(timeout)) {
            tmp.push(Promise.delay(timeout)).return(EXIT_CODES.SHUTDOWN_TIMEOUT_EXCEEDED);
        }
        
        return Promise.any(tmp).catch(function (err) {
            return {
                code: EXIT_CODES.SHUTDOWN_HANDLER_THREW,
                cleanupHanndlers: cleanupHandlers
            };
        }).then(function (result) {
            if (result === EXIT_CODES.SHUTDOWN_TIMEOUT_EXCEEDED) {
                return {
                    code: result,
                    cleanupHandlers: cleanupHandlers
                };
            }
            return {
                code: code,
                errors: result
            };
        }).then(function (result) {
            app.emit('after shutdown', result);
            return result.code;
        });
    };
};
