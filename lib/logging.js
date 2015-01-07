'use strict';

var Promise = require('bluebird'),
    bunyan = require('bunyan'),
    PATH = require('path');

var LogrotateStream = require('logrotate-stream'),
    BunyanScreenlogger = require('@eros/bunyan-screenlogger'),
    Syslog = require('syslog2');

module.exports = Promise.method(function (app) {
    var cfg = app.config.get() || { };
    
    if (cfg.quiet || !cfg.log) {
        return app;
    }
    
    var logCfg = cfg.log,
        appName = cfg.app && cfg.app.name;
    
    // if log stream has an error, we want to bail since
    // whatever's wrong won't get logged anywhere!
    // let whatever is managing our process restart us.
    function onStreamError(err) {
        console.error('Log error:', err);
        process.exit(1);
    }
    
    var streams = logCfg.types.map(function (type) { // jshint ignore: line
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
                
                strim.on('error', onStreamError);
                
                return {
                    level: opts.level || logCfg.level || 'info',
                    stream: strim
                };
            
            case 'screen':
                strim = new BunyanScreenlogger({
                    color: true,
                    outputMode: 'long'
                });
                
                strim.pipe(process.stdout);
                
                return {
                    type: 'raw',
                    level: opts.level || logCfg.level || 'info',
                    stream: strim
                };
            
            case 'syslog':
                opts.connection = opts.connection || { };
                opts.connection.type = opts.connection.type || 'unix';
                var syslog = Syslog.create({
                    facility: opts.facility || 'local2',
                    connection: opts.connection
                });

                syslog.on('error', onStreamError);
                
                return {
                    type: 'raw',
                    level: opts.level || logCfg.level || 'trace',
                    stream: syslog
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
                stream.once('finish', resolve);
                stream.once('error', reject);
                stream.end();
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
