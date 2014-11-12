'use strict';

var convict = require('convict'),
    PATH = require('path');

var Promise = require('bluebird');

module.exports = Promise.method(function (app, schema) {
    schema = schema || require(app.path('config.js'));
    
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
    
    [   PATH.join(app.root, 'env', env + '.json'),
        PATH.join('/etc/', appname + '.json'),
        PATH.join(getUserHome(), '.' + appname + '.json'),
        PATH.join('.', 'config.json')
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
    
    // throws if errors -> rejected promise by Promise.method wrapper
    conf.validate();
    
    app.config = conf;
    return app;
});
