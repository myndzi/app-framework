'use strict';

var Promise = require('bluebird'),
    winston = require('winston'),
    fs = require('fs');

module.exports = Promise.method(function (app) {
    var cfg = app.config.get() || { };
    
    if (cfg.quiet || !cfg.log) {
        return app;
    }
    
    var logCfg = cfg.log,
        appName = cfg.app && cfg.app.name;
    
    var transports = [ ];
    var LEVELS = {
        trace: 0,
        silly: 1,
        info: 2,
        warn: 3,
        error: 4
    };
    
    var streams = [ ];
    transports = logCfg.types.map(function (type) {
        switch (type) {
            case 'file':
                var strim = fs.createWriteStream(logCfg.file.filename);
                streams.push(strim);
                return new winston.transports.File({
                    stream: strim,
                    level: logCfg.level
                });
            
            case 'screen':
                var Logger = require('winston-screenlogger');
                return new Logger({
                    tag: appName,
                    level: logCfg.level
                });
            
            case 'syslog':
                var SN = require('winston-syslog-native').SyslogNative;
                
                // rewire the levels
                
                /* jshint sub: true */
                SN.levels = {
                    'trace': SN.LOG_DEBUG,
                    'silly': SN.LOG_INFO,
                    'info': SN.LOG_NOTICE,
                    'warn': SN.LOG_WARNING,
                    'error': SN.LOG_ALERT
                };
                /* jshint sub: false */
                
                return new SN({
                    name: appName,
                    flags: SN.LOG_PID | SN.LOG_ODELAY, // jshint ignore:line
                    facility: SN['LOG_' + logCfg.syslog.facility] || SN.LOG_LOCAL1,
                    level: logCfg.level
                });
                
            default:
                return null;
        }
    }).filter(function (val) { return val !== null; });
    
    var log = new winston.Logger({
        transports: transports,
        levels: LEVELS
    });
    
    // winston doesn't do async resource closure, so we hack around it with streams
    // when using a file logger
    var _close = log.close;
    log.close = function () {
        _close.call(log);
        return Promise.settle(streams.map(function (stream) {
            return new Promise(function (resolve, reject) {
                stream.once('close', resolve);
                stream.once('error', reject);
            });
        })).tap(function () {
            streams.length = 0;
        });
    };
    
    var _log = app.log;
    app.log = log;
    app.on('shutdown', function () {
        process.nextTick(function () {
            app.log = _log;
            log.close();
        });
    });
    
    return app;
});
