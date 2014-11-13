'use strict';

var express = require('express'),
    PATH = require('path'),
    util = require('util'),
    fs = require('fs');

var Promise = require('bluebird');

module.exports = function (config) {
    var app = express(),
        appRoot = config && config.root;
    
    app.config = config || { };
    
    app.root = appRoot = fs.existsSync(appRoot) ? appRoot : PATH.resolve(PATH.join(__dirname, '..'));

    app.lib = function (path) { return require(PATH.join(appRoot, 'lib', path)); };
    app.path = function (path) { return PATH.join(appRoot, 'app', path); };

    var EXIT_CODES = require('./exit-codes');
    
    if (app.config.quiet) {
        require('./null-logger')(app);
    } else {
        require('./basic-logger')(app);
    }

    require('./live-config')(app);
    app.on('configure', function () { app.env = app.config.get('env'); });
    app.on('loaded', function () {
        app.log.silly(['Resolved config:', app.config.get()]);
    });
    
    require('./listener')(app);
    app.on('listening', function (address, port, env) {
        app.log.info(['Server listening on %s:%s in %s mode', address, port, env]);
    });
    
    require('./shutdown')(app);
    var sd_start = Date.now();
    app.on('before shutdown', function (code, msg, timeout) {
        var type = (code === EXIT_CODES.RELOAD ? 'Restarting' : 'Shutting down'),
            timeout = (isNaN(timeout) ? '(no timeout)' : '(timeout: ' + timeout + 'ms)');
        
        app.log.info(['%s: %s (%s)', type, msg, timeout]);
    });
    app.on('after shutdown', function (result) {
        if (result.errors.length) {
            app.log.error(['The following errors occurred shutting down:', errors]);
        } else {
            var dur = (Date.now() - sd_start) / 1000;
            app.log.info(['App successfully shut down (%sms)', dur]);
        }
    });
    
    var load = require('./load-files');

    return Promise.resolve(app)
    .tap(require('./configure'))
    .tap(require('./logging'))
    .tap(function (app) {
        var modules = app.config.get('app').modules || [ ];
        return Promise.reduce(modules, function (ret, args) {
            if (!Array.isArray(string)) { args = [ args ]; }
            
            return load.apply(null, args)(app);
        });
    })/*
    .tap(load('database'))
    .tap(load('services'))
    .tap(load('middleware'))
    .tap(load('models'))
    .tap(load('resources'))*/
    //.tap(function () { return app.swag.init(); }) // bind the 'loaded' event
    .tap(function () {
        process.nextTick(function () {
            app.emit('loaded');
        });
    });
};
