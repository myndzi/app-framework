'use strict';

var fs = require('fs'),
    PATH = require('path');

var convict = require('convict'),
    extendConvict = require('./extend-convict');

// sets up a config environment for components that load before the schema proper
// TODO: deal with this potentially conflicting with the defined schema
module.exports = function (app, config) { // jshint maxcomplexity: 20, maxstatements: 35
    config = config || { };
    
    config.app = config.app || { };
    config.log = config.log || { };
    
    // deal with passing flat options / legacy keys
    
    if (config.env) {
        config.app.env = config.app.env || config.env;
        delete config.env;
    }
    if (config.root) {
        config.app.root = config.app.root || config.root;
        delete config.root;
    }
    if (config.name) {
        config.app.name = config.app.name || config.name;
        delete config.name;
    }
    if (config.quiet) {
        config.log.level = config.log.level || 'none';
        delete config.quiet;
    }
    
    var conf = convict({ });
    conf.load(config);
    
    conf = extendConvict(conf, {
        app: {
            bindSignals: {
                doc: 'Whether to bind SIGINT and SIGTERM handlers',
                default: true,
                env: 'BIND_SIGNALS',
                arg: 'bind-signals'
            },
            env: {
                doc: 'Application environment',
                format: ['development', 'testing', 'production'],
                default: (typeof describe === 'function' ? 'testing' : 'development'),
                env: 'NODE_ENV',
                arg: 'node-env'
            }
        }
    });
    
    conf = extendConvict(conf, {
        app: {
            root: {
                doc: 'Application root',
                default: (function () {
                    // find main package dir
                    var path = require.main.filename, newPath;
                    while (!fs.existsSync(PATH.join(path, 'package.json'))) {
                        newPath = PATH.dirname(path);
                        if (path === newPath) {
                            throw new Error('No suitable root directory was found');
                        }
                        path = newPath;
                    }
                    return path;
                })(),
                env: 'APP_ROOT',
                arg: 'app-root'
            }
        }
    });
    
    var appRoot = conf.get('app.root');
    
    try {
        var stat = fs.statSync(appRoot);
        if (!stat.isDirectory()) {
            throw new Error('App root isn\'t a directory: ' + appRoot);
        }
    } catch (e) {
        if (e.code === 'ENOENT') {
            throw new Error('App root doesn\'t exist: ' + appRoot);
        }
        throw e;
    }

    var pjson;
    try {
        pjson = require(PATH.join(conf.get('app.root'), 'package.json'));
    } catch (e) {
        pjson = { };
    }
        
    conf = extendConvict(conf, {
        app: {
            name: {
                doc: 'Application name',
                default: pjson.name || PATH.basename(conf.get('app.root')),
                env: 'APP_NAME',
                arg: 'app-name'
            },
            version: { // this should never be set, but it's specified to make it available throughout the app
                doc: 'Application version',
                default: pjson.version || 'Undefined'
            }
        },
        log: {
            level: {
                doc: 'Log level',
                format: ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'none'],
                default: (function () {
                    switch (conf.get('app.env')) {
                        case 'testing':
                            return 'none';
                        case 'development':
                            return 'debug';
                        default:
                            return 'warn';
                    }
                })(),
                env: 'LOG_LEVEL',
                arg: 'log-level'
            },
			types: {
				doc: 'Types of loggers to use',
				format: ['file', 'screen', 'syslog', 'ringbuffer'],
				default: ['screen']
			}
        }
    });
    
    app.config = conf;
};
