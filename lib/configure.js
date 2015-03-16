'use strict';

var convict = require('convict'),
    PATH = require('path');

var Promise = require('bluebird');

module.exports = Promise.method(function (app, schema) { // jshint ignore: line
    var preConfig = app.config || { };
    
    var cfgPath = PATH.join(app.root, 'config');
    schema = schema || require(PATH.join(cfgPath, '.schema.js'));
    
    if (typeof schema === 'function') {
        schema = schema(app);
    }
    
    var conf = convict(schema);
    conf.load(preConfig);

    if (typeof describe === 'function') {
        // ensure testing environment
        conf.set('env', 'testing');
    }
    
    var env = conf.get('env');

    function getUserHome() {
        return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
    }

    var appname = conf.get('app.name');
    
    if (app.log) { app.log.info('Loading config...'); }
    
    [   PATH.join(cfgPath, 'all.js'),
        PATH.join(cfgPath, env + '.js'),
        PATH.join('/etc/', appname + '.js'),
        PATH.join(getUserHome(), '.' + appname + '.js')
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
    
    // throws if errors -> rejected promise by Promise.method wrapper
    conf.validate();
    
    app.config = conf;
    app.env = conf.get('env');
    return app;
});
