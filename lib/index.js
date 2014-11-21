'use strict';

var restify = require('restify'),
    PATH = require('path'),
    fs = require('fs');

var Promise = require('bluebird');

module.exports = function (config) { // jshint ignore: line
    config = config || { };
    
    var appRoot = config && config.root;
    var appName = (config.app && config.app.name ? config.app.name : 'app');
    
    var app = restify.createServer({ name: appName });
    
    app.config = config;
    
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
        var type = (code === EXIT_CODES.RELOAD ? 'Restarting' : 'Shutting down');
        msg = msg || 'no message';
        timeout = (isNaN(parseInt(timeout, 10)) ? '(no timeout)' : '(timeout: ' + timeout + 'ms)');
        
        app.log.info(['%s: %s %s', type, msg, timeout]);
    });
    app.on('after shutdown', function (result) {
        if (result.errors.length) {
            app.log.error(['The following errors occurred shutting down:', result.errors]);
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
        return Promise.each(modules, function (args) {
            return load(args)(app);
        });
    })
    .tap(function () {
        process.nextTick(function () {
            app.emit('loaded');
        });
    });
};
