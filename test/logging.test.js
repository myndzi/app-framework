'use strict';

require('should-eventually');

var EventEmitter = require('events').EventEmitter;

var fs = require('fs'),
    PATH = require('path'),
    Promise = require('bluebird');

Promise.promisifyAll(fs, { suffix: '$' });

describe('logging', function () {
    var mockApp = new EventEmitter();
    require('../lib/null-logger')(mockApp);
    function configure(obj) {
        mockApp.config = {
            get: function getCfg(key) {
                switch (key) {
                    case 'app': return { name: 'foo' };
                    case 'log': return obj;
                    default:
                        return {
                            app: getCfg('app'),
                            log: getCfg('log')
                        };
                }
            }
        };
    }
    var mod = require('../lib/logging');
    
    it('should attach a \'log\' property to the app with appropriate methods', function () {
        configure({
            screen: { level: 'trace' }
        });
        return mod(mockApp).then(function (app) {
            app.should.have.property('log');
            ['trace', 'silly', 'info', 'warn', 'error']
            .forEach(function (type) { app.log[type].should.be.a.Function; });
        });
    });
    
    describe('file logging', function () {
        var tempLog = PATH.join(__dirname, 'temp.log');
        
        beforeEach(function () {
            return fs.unlink$(tempLog).catch(function () { });
        });
        afterEach(function () {
            return fs.unlink$(tempLog).catch(function () { });
        });
        
        it('should write each log type to file', function () {
            configure({
                file: {
                    filename: tempLog,
                    level: 'trace'
                }
            });
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.silly('silly');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');

                return app.log.close();
            }).then(function () {
                return fs.readFile$(tempLog);
            }).then(function (buf) {
                var arr = buf.toString()
                    .split('\n')
                    .filter(function (a) { return a; });
                    
                var types = ['trace', 'silly', 'info', 'warn', 'error'];
                
                arr.forEach(function (line) {
                    line = JSON.parse(line);
                    line.level.should.equal(line.message);
                    types.splice(types.indexOf(line.level), 1);
                });
                
                types.length.should.equal(0);
            });
        });
        
        it('should limit writes to errors only when configured to do so', function () {
            configure({
                file: {
                    filename: tempLog,
                    level: 'error'
                }
            });
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.silly('silly');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');

                return app.log.close();
            }).then(function () {
                return fs.readFile$(tempLog);
            }).then(function (buf) {
                var arr = buf.toString()
                    .split('\n')
                    .filter(function (a) { return a; });
                
                arr.length.should.equal(1);
            });
        });
    });
    
    describe('screen logging', function () {
        var Logger = require('winston-screenlogger'),
            _log = Logger.prototype.log;
        var msgs = [ ];
        before(function () {
            Logger.prototype.log = function (level, message) {
                msgs.push({
                    level: level,
                    message: message
                });
            };
        });
        after(function () {
            Logger.prototype.log = _log;
        });
        
        it('should write each log type to the screen', function () {
            configure({
                screen: { level: 'trace' }
            });
            
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.silly('silly');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');

                return app.log.close();
            }).then(function () {
                var arr = msgs;
                msgs = [ ];
                
                var types = ['trace', 'silly', 'info', 'warn', 'error'];
                
                arr.forEach(function (line) {
                    line.level.should.equal(line.message);
                    types.splice(types.indexOf(line.level), 1);
                });
                
                types.length.should.equal(0);
            });
        });
        it('should limit writes to errors only when configured to do so', function () {
            configure({
                screen: {
                    level: 'error'
                }
            });
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.silly('silly');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');

                return app.log.close();
            }).then(function () {
                var arr = msgs;
                msgs = [ ];
                
                arr.length.should.equal(1);
            });
        });
    });
    
    describe('syslog logging', function () {
        var Syslog = require('winston-syslog-native/node_modules/node-syslog'),
            SN = require('winston-syslog-native').SyslogNative;
        
        var _init = Syslog.init,
            _log = Syslog.log;
        
        var _initCB = function () { },
            _logCB = function () { };
            
        var initCB = function (fn) { _initCB = fn; },
            logCB = function (fn) { _logCB = fn; };

        var msgs = [ ];
        
        before(function () {
            Syslog.init = function () { return _initCB.apply(Syslog, arguments); }
            Syslog.log = function () { return _logCB.apply(Syslog, arguments); }
        });
        
        after(function () {
            Syslog.init = _init;
            Syslog.log = _log;
        });
        
        it('should initialize Syslog with the correct facility', function () {
            configure({
                syslog: { facility: 'LOCAL3' }
            });
            initCB(function (name, flags, facility) {
                facility.should.equal(Syslog.LOG_LOCAL3);
            });

            return mod(mockApp);
        });
        it('should log to syslog', function () {
            configure({
                syslog: {
                    facility: 'LOCAL3',
                    level: 'trace'
                }
            });
            
            return mod(mockApp).then(function (app) {
                var levels = Object.keys(SN.levels).reduce(function (ret, key) {
                    ret[SN.levels[key]] = key;
                    return ret;
                }, { });
                
                logCB(function (level, msg) {
                    msgs.push({
                        level: levels[level],
                        message: msg
                    });
                });

                app.log.trace('trace');
                app.log.silly('silly');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');

                return app.log.close();
            }).then(function () {
                var arr = msgs;
                msgs = [ ];
                
                var types = ['trace', 'silly', 'info', 'warn', 'error'];
                
                arr.forEach(function (line) {
                    line.level.should.equal(line.message);
                    types.splice(types.indexOf(line.level), 1);
                });
                
                types.length.should.equal(0);
            });
        });
        it('should limit writes to errors only when configured to do so', function () {
            configure({
                syslog: {
                    facility: 'LOCAL3',
                    level: 'error'
                }
            });
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.silly('silly');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');

                return app.log.close();
            }).then(function () {
                var arr = msgs;
                msgs = [ ];
                
                arr.length.should.equal(1);
            });
        });
    });
});
