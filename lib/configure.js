'use strict';

var convict = require('convict'),
    PATH = require('path');

var Promise = require('bluebird');

module.exports = Promise.method(function (app, schema) { // jshint ignore: line
    var preConfig = app.config || { };
    
    var cfgPath = PATH.join(app.root, 'config');
    schema = schema || require(PATH.join(cfgPath, 'schema.js'));
    
    if (typeof schema === 'function') {
        schema = schema(app);
    }
    
    var conf = convict(schema);

    if (typeof describe === 'function') {
        // ensure testing environment
        conf.set('env', 'testing');
    }
    
    var env = conf.get('env');

    function getUserHome() {
        return process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
    }

    var appname = conf.get('app.name');
    
    var log = (env === 'development');
    if (log) { app.log.info('Loading config...'); }
    
    [   PATH.join(cfgPath, 'all.json'),
        PATH.join(cfgPath, env + '.json'),
        PATH.join('/etc/', appname + '.json'),
        PATH.join(getUserHome(), '.' + appname + '.json')
    ].forEach(function (path) {
        path = PATH.resolve(path);
        try {
            var data = require(path);
            if (data && typeof data === 'object') {
                conf.load(data);
                if (log) { app.log.info(path + '...OK'); }
            }
        } catch (e) {
            if (e.code !== 'MODULE_NOT_FOUND') { throw e; }
            if (log) { app.log.info(path + '...NOT FOUND'); }
        }
    });
    conf.load(preConfig);
    
    // throws if errors -> rejected promise by Promise.method wrapper
    conf.validate();
    
    app.config = conf;
    app.env = env;
    return app;
});
