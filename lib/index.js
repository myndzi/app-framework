'use strict';

var express = require('express'),
    PATH = require('path'),
    util = require('util'),
    fs = require('fs');

var Logger = require('logger');

module.exports = function (appRoot) {
    var app = express();
    
    app.root = appRoot = fs.existsSync(appRoot) ? appRoot : PATH.resolve(__dirname+'/../..');

    app.lib = function (path) { return require(PATH.join(appRoot, 'lib', path)); };
    app.path = function (path) { return PATH.join(appRoot, 'app', path); };

    var EXIT_CODES = app.lib('constants/exit-codes');
    
    require('./basic-logger')(app);

    require('./live-config')(app);
    app.on('configure', function () { app.env = app.config.get('env'); });
    app.on('loaded', function () {
        app.log.silly(['Resolved config:', app.config.get()]);
    });
    
    require('./listener')(app);
    app.on('listening', function (address, port, env) {
        app.log.info(['Server listening on %s:%s in %s mode', a.address, a.port, app.env]);
    });
    
    require('./shutdown')(app);
    var sd_start = Date.now();
    app.on('before shutdown', function (code, msg, timeout) {
        var type = (code === EXIT_CODES.RELOAD ? 'Restarting' : 'Shutting down'),
            timeout = (isNaN(timeout) ? '(no timeout)' : '(timeout: ' + timeout + 'ms)');
        
        app.log.info(['%s: %s (%s)', type, msg, timeout);
    });
    app.on('after shutdown', function (result) {
        if (result.errors.length) {
            app.log.error(['The following errors occurred shutting down:', errors]);
        } else {
            var dur = (Date.now() - sd_start) / 1000);
            app.log.info(['App successfully shut down (%sms)', dur]);
        }
    });
    
    var load = app.lib('load-files');

    return Promise.resolve(app)
    .tap(require('./configure'))
    .tap(require('./logging'))
    .tap(load('database'))
    .tap(load('services'))
    .tap(load('middleware'))
    .tap(load('models'))
    .tap(load('resources'))
    .tap(function () { return app.swag.init(); })
    .tap(function () { app.emit('loaded'); });
};
