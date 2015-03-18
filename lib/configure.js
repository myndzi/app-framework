'use strict';

var convict = require('convict'),
    PATH = require('path');

var Promise = require('bluebird');

module.exports = Promise.method(function (app, config, schema) { // jshint ignore: line
    var preConfig = app.config.get();
    
    var cfgPath = PATH.join(app.config.get('app.root'), 'config');
    if (schema) {
        if (app.log) { app.log.debug('Using supplied schema...'); }
    } else {
        try {
            schema = require(PATH.join(cfgPath, '.schema.js'));
        } catch (e) {
            if (app.log) { app.log.debug('Couldn\'t load schema from %s', cfgPath); }
            schema = { };
        }
    }
    
    if (typeof schema === 'function') {
        schema = schema(app);
    }
    
    // required schema values
    
    schema.app = schema.app || { };
    schema.log = schema.log || { };
    
    schema.app.env = schema.app.env || {
        doc: 'Application environment',
        format: ['development', 'testing', 'production'],
        default: preConfig.app.env,
        env: 'NODE_ENV',
        arg: 'node-env'
    };
    
    schema.app.name = schema.app.name || {
        doc: 'Application name',
        default: preConfig.app.name,
        env: 'APP_NAME',
        arg: 'app-name'
    };
    
    schema.app.root = schema.app.root || {
        doc: 'Application root',
        default: preConfig.app.root,
        env: 'APP_ROOT',
        arg: 'app-root'
    };
    
    schema.log.level = schema.log.level || {
        doc: 'Log level',
        format: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
        default: preConfig.log.level,
        env: 'LOG_LEVEL',
        arg: 'log-level'
    };
    
    var conf = convict(schema);
    
    // load the merged defaults and specified config
    conf.load(preConfig);
    
    var env = conf.get('app.env');
    var appName = conf.get('app.name');

    function getUserHome() {
        return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
    }
    
    if (app.log) { app.log.debug('Loading config...'); }
    
    [   PATH.join(cfgPath, 'all.js'),
        PATH.join(cfgPath, env + '.js'),
        PATH.join('/etc/', appName + '.js'),
        PATH.join(getUserHome(), '.' + appName + '.js')
    ].forEach(function (path) {
        path = PATH.resolve(path);
        try {
            var data = require(path);
            if (data && typeof data === 'object') {
                conf.load(data);
                if (app.log) { app.log.info(path + '...OK'); }
            }
        } catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
            if (app.log) { app.log.info(path + '...NOT FOUND'); }
        }
    });
    
    // reload the explicitly specified config components (highest priority)
    if (config && typeof config === 'object') { conf.load(config); }
    
    // throws if errors -> rejected promise by Promise.method wrapper
    conf.validate();
    
    app.config = conf;
    app.emit('configure');
    
    return app;
});
