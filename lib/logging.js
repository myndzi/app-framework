'use strict';

var Promise = require('bluebird'),
    bunyan = require('bunyan'),
    PATH = require('path');

var LogrotateStream = require('logrotate-stream'),
    BunyanScreenlogger = require('@eros/bunyan-screenlogger'),
    bsyslog = require('bunyan-syslog');

module.exports = Promise.method(function (app) {
    var cfg = app.config.get() || { };
    
    if (cfg.quiet || !cfg.log) {
        return app;
    }
    
    var logCfg = cfg.log,
        appName = cfg.app && cfg.app.name;
    
    var streams = Object.keys(logCfg).map(function (type) { // jshint ignore: line
        var opts = logCfg[type] || { },
            strim;
        
        switch (type) {
            case 'file':
                var filename;
                if (opts.filename[0] === '/') {
                    filename = opts.filename;
                } else {
                    filename = PATH.resolve(PATH.join(app.root, opts.filename || 'log/app.log'));
                }
                
                strim = new LogrotateStream({
                    file: filename,
                    size: opts.size || '100k',
                    keep: opts.keep || 5
                });
                return {
                    level: opts.level || logCfg.level || 'info',
                    stream: strim
                };
            
            case 'screen':
                strim = new BunyanScreenlogger({
                    outputMode: 'long'
                });
                return {
                    type: 'raw',
                    level: opts.level || logCfg.level || 'info',
                    stream: strim
                };
            
            case 'syslog':
                strim = bsyslog.createBunyanStream({
                    type: 'sys',
                    facility: bsyslog[opts.facility.toLowerCase()] || bsyslog.local2,
                    host: opts.host || '127.0.0.1',
                    port: opts.port || 514
                });
                return {
                    type: 'raw',
                    level: opts.level || logCfg.level || 'trace',
                    stream: strim
                };
            
            case 'ringbuffer':
                strim = new bunyan.RingBuffer({ limit: 100 });
                return {
                    type: 'raw',
                    level: opts.level || logCfg.level || 'trace',
                    stream: strim
                };
                
            default:
                return null;
        }
    }).filter(function (a) { return a !== null; });
    
    var log = bunyan.createLogger({
        name: appName,
        streams: streams
    });
    
    log.close = function () {
        return Promise.settle(streams.map(function (stream) {
            stream = stream.stream;
            return new Promise(function (resolve, reject) {
                stream.on('finish', resolve);
                stream.on('error', reject);
                
                // i'm *pretty sure* this isn't supposed to be necessary, but it fails otherwise
                if (stream.writableState.writing) {
                    stream.once('drain', stream.end.bind(stream));
                } else {
                    stream.end();
                }
            });
        }));
    };
    
    var _log = app.log;
    app.log = log;
    app.on('shutdown', function () {
        // let as many other things log messages as possible before closing the logger
        process.nextTick(function () {
            app.log = _log;
            log.close();
        });
    });
    
    return app;
});
