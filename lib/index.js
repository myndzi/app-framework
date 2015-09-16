'use strict';

var PATH = require('path');

var express = require('express'),
    Promise = require('bluebird');

var EXIT_CODES = require('./exit-codes');

module.exports = function (config, opts) { // jshint ignore: line
    opts = opts || { };
    opts.lib = opts.lib || 'lib';
    opts.app = opts.app || 'app';
    
    var app = express();
    
    require('./pre-config')(app, config);
    
    if (app.config.get('log.level') === 'none') {
        require('./null-logger')(app);
    } else {
        require('./basic-logger')(app);
    }

    require('./live-config')(app);
    
    function reconfigure() {
        app.env = app.config.get('app.env');
        app.root = app.config.get('app.root');
        
        app.lib = function (path) { return require(PATH.join(app.root, opts.lib, path)); };
        app.path = function (path) { return PATH.join(app.root, opts.app, path); };
    }
    
    app.on('configure', reconfigure);
    reconfigure();
    
    app.on('loaded', function () {
        app.log.debug(app.config.get(), 'Resolved config:');
    });
    
    require('./listener')(app);
    app.on('listening', function (address, port, env) {
        app.log.info('Server listening on %s:%s in %s mode', address, port, env);
    });
    
    require('./shutdown')(app);
    var sd_start = Date.now();
    app.on('before shutdown', function (code, msg, timeout) {
        var type = (code === EXIT_CODES.RELOAD ? 'Restarting' : 'Shutting down');
        msg = msg || 'no message';
        timeout = (isNaN(parseInt(timeout, 10)) ? '(no timeout)' : '(timeout: ' + timeout + 'ms)');
        
        app.log.info('%s: %s %s', type, msg, timeout);
    });
    app.on('after shutdown', function (result) {
        if (result.errors.length) {
            app.log.error('The following errors occurred shutting down:', result.errors);
        } else {
            var dur = (Date.now() - sd_start) / 1000;
            app.log.info('App successfully shut down (%sms)', dur);
        }
    });
    
    var load = require('./load-files');
    app.loadFiles = load;

    return Promise.resolve(app)
    .tap(function (app) { return require('./configure')(app, config, opts.schema); })
    .tap(require('./logging'))
    .tap(function (app) {
        var cfg = app.config.get();
        if (cfg && cfg.app && cfg.app.maxListeners) {
            app.setMaxListeners(cfg.app.maxListeners);
        }
    })
    .tap(function (app) {
        var modules = app.config.get('app').modules || [ ];
        return Promise.each(modules, function (args) {
            return load(args)(app);
        });
    })
    .tap(function () {
        process.nextTick(function () {
            app.emit('loaded');
        });
    })
    .catch(function (err) {
        app.log.error(err, 'App startup failure');
        return app.shutdown()
        .finally(function () {
            throw err;
        });
    });
};
