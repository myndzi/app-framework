'use strict';

require('should-eventually');
var net = require('net');

var PATH = require('path');

describe('listener', function () {
    var mockApp = net.createServer();
    mockApp.root = __dirname;
    mockApp.config = {
        get: function (type) {
            switch (type) {
                case 'app': return {
                    port: 1234,
                    ip: '127.0.0.1'
                };
            }
        }
    };
    function noop() { }
    mockApp.log = {
        trace: noop,
        silly: noop,
        info: noop,
        warn: noop,
        error: noop
    };
    
    var server;
    
    before(function () {
        require('../lib/listener')(mockApp);
    });
    
    it('should add a .listen method to \'app\'', function () {
        mockApp.should.have.property('listen').which.is.a.Function;
    });
    
    it('should emit a \'server\' event when the server has been created', function () {
        var called = false;
        mockApp.once('server', function (_server) {
            server = _server;
            called = true;
        });
        return mockApp.listen().then(function () {
            called.should.equal(true);
        });
    });
    
    it('should clean up when a \'shutdown\' event is emitted on app', function (done) {
        mockApp.emit('shutdown', function (fn) {
            fn(function () {
                server.listeners().should.be.an.Array.of.length(0);
                done();
            });
        });
    });
    
    it('should emit a \'listening\' event when the server is listening', function () {
        var called = false;
        mockApp.once('listening', function () {
            called = true;
        });
        return mockApp.listen().then(function () {
            called.should.equal(true);
        });
    });
    
    it('should call app.shutdown on an error event', function (done) {
        mockApp.shutdown = function () {
            mockApp.emit('shutdown');
            server.listeners().should.be.an.Array.of.length(0);
            done();
        };
        server.emit('error');
    });
    
});
