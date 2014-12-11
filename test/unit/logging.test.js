'use strict';

require('should-eventually');

var EventEmitter = require('events').EventEmitter;
var PassThrough = require('stream').PassThrough;

var fs = require('fs'),
    net = require('net'),
    PATH = require('path'),
    Promise = require('bluebird');

Promise.promisifyAll(fs, { suffix: '$' });

var TRACE = 10;
var DEBUG = 20;
var INFO = 30;
var WARN = 40;
var ERROR = 50;
var FATAL = 60;

var levelFromName = {
    'trace': TRACE,
    'debug': DEBUG,
    'info': INFO,
    'warn': WARN,
    'error': ERROR,
    'fatal': FATAL
};
var nameFromLevel = {};
var upperNameFromLevel = {};
var upperPaddedNameFromLevel = {};
var prefixFromLevel = {};
Object.keys(levelFromName).forEach(function (name) {
    var lvl = levelFromName[name];
    nameFromLevel[lvl] = name;
    upperNameFromLevel[lvl] = name.toUpperCase();
    upperPaddedNameFromLevel[lvl] = (
        name.length === 4 ? ' ' : '') + name.toUpperCase();
    prefixFromLevel[lvl] = name.slice(0, 1);
});

describe('logging', function () {
    var mockApp = new EventEmitter();
    require('../../lib/null-logger')(mockApp);
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
    var mod = require('../../lib/logging');
    
    it('should attach a \'log\' property to the app with appropriate methods', function () {
        configure({
            types: ['screen'],
            level: 'trace'
        });
        return mod(mockApp).then(function (app) {
            app.should.have.property('log');
            ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
            .forEach(function (type) {
                app.log[type].should.be.a.Function;
            });
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
                types: ['file'],
                level: 'trace',
                file: {
                    filename: tempLog
                }
            });
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.debug('debug');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');
                app.log.fatal('fatal');

                return app.log.close();
            }).then(function () {
                return Promise.delay(100);
            }).then(function () {
                return fs.readFile$(tempLog);
            }).then(function (buf) {
                var arr = buf.toString()
                    .split('\n')
                    .filter(function (a) { return a; });
                    
                var types = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
                
                arr.forEach(function (line) {
                    line = JSON.parse(line);
                    nameFromLevel[line.level].should.equal(line.msg);
                    types.splice(types.indexOf(line.level), 1);
                });
                
                types.length.should.equal(0);
            });
        });
        
        it('should limit writes to errors only when configured to do so', function () {
            configure({
                types: ['file'],
                level: 'error',
                file: {
                    filename: tempLog
                }
            });
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.debug('debug');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');
                app.log.fatal('fatal');

                return app.log.close();
            }).then(function () {
                return Promise.delay(100);
            }).then(function () {
                return fs.readFile$(tempLog);
            }).then(function (buf) {
                var arr = buf.toString()
                    .split('\n')
                    .filter(function (a) { return a; });
                
                arr.length.should.equal(2);
            });
        });
    });
    
    describe('screen logging', function () {
        var Logger = require('@eros/bunyan-screenlogger'),
            _log = Logger.prototype.log;
        var msgs = [ ];
        before(function () {
            Logger.prototype._transform = function (rec, encoding, cb) {
                msgs.push(rec);
                cb();
            };
        });
        after(function () {
            Logger.prototype.log = _log;
        });
        
        it('should write each log type to the screen', function () {
            configure({
                types: ['screen'],
                level: 'trace',
                screen: { }
            });
            
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.debug('debug');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');
                app.log.fatal('fatal');

                return app.log.close();
            }).then(function () {
                var arr = msgs;
                msgs = [ ];
                
                var types = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
                
                arr.forEach(function (line) {
                    nameFromLevel[line.level].should.equal(line.msg);
                    types.splice(types.indexOf(line.level), 1);
                });
                
                types.length.should.equal(0);
            });
        });
        it('should limit writes to errors only when configured to do so', function () {
            configure({
                types: ['screen'],
                level: 'error',
                screen: { }
            });
            return mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.debug('debug');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');
                app.log.fatal('fatal');

                return app.log.close();
            }).then(function () {
                var arr = msgs;
                msgs = [ ];
                
                arr.length.should.equal(2);
            });
        });
    });
    
    describe('syslog logging', function () {
        var pt, msgs = [ ];
        
        var server, BIND_PORT = 1414;
        
        beforeEach(function (done) {
            server = net.createServer();
            server.listen(BIND_PORT, done);
        });
        afterEach(function (done) {
            server.close(done);
        });
        
        it('should log to syslog', function (done) {
            configure({
                types: ['syslog'],
                level: 'trace',
                syslog: {
                    facility: 'local3',
                    connection: {
                        type: 'tcp',
                        port: BIND_PORT
                    }
                }
            });
            
            mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.debug('debug');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');
                app.log.fatal('fatal');
                
                server.on('connection', function (socket) {
                    socket.on('data', function (chunk) {
                        // checking the message contents more strictly is troublesome
                        
                        var msgs = chunk.toString().split(/\r?\n/)
                            .filter(function (a) { return a; });
                        msgs.length.should.equal(6);
                        
                        app.log.close().nodeify(done);
                    });
                });
            });
        });
        it('should limit writes to errors only when configured to do so', function (done) {
            configure({
                types: ['syslog'],
                level: 'error',
                syslog: {
                    facility: 'local3',
                    connection: {
                        type: 'tcp',
                        port: BIND_PORT
                    }
                }
            });
            
            mod(mockApp).then(function (app) {
                app.log.trace('trace');
                app.log.debug('debug');
                app.log.info('info');
                app.log.warn('warn');
                app.log.error('error');
                app.log.fatal('fatal');
                
                server.on('connection', function (socket) {
                    socket.on('data', function (chunk) {
                        // checking the message contents more strictly is troublesome
                        
                        var msgs = chunk.toString().split(/\r?\n/)
                            .filter(function (a) { return a; });
                        msgs.length.should.equal(2);
                        
                        app.log.close().nodeify(done);
                    });
                });
            });
        });
    });
});
