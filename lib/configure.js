'use strict';

var convict = require('convict'),
    cUtils = require('./convict-utils'),
    PATH = require('path');

var Promise = require('bluebird');

module.exports = Promise.method(function (app, config, schema) { // jshint ignore: line
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
        schema = schema(app, convict);
    }

    var conf = cUtils.extendConvict(app.config, schema);

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
    if (config && typeof config === 'object') {
      // convict overrides anything loaded this way with environment vars/arguments! we have to do it the hard way...
      // conf.load(config);
      cUtils.load(conf, config);
    }

    // throws if errors -> rejected promise by Promise.method wrapper
    conf.validate();

    app.config = conf;
    app.emit('configure');

    return app;
});
