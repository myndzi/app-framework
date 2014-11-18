'use strict';

require('should-eventually');

var PATH = require('path'),
    EventEmitter = require('events').EventEmitter;

var Promise = require('bluebird');

describe('shutdown', function () {
    var mockApp, called;
    
    var mod = require('../../lib/shutdown');
    
    var EXIT_CODES = require('../../lib/exit-codes');
    
    beforeEach(function () {
        mockApp = new EventEmitter();
        mockApp.root = __dirname;

        called = 0;
        
        mod(mockApp);
    });
    function didCall() { called++; }
    function wasCalled(arg) {
        if (typeof arg === 'number') {
            return function () { called.should.equal(arg); }
        } else {
            called.should.be.above(0);
        }
    }
    
    it('should add \'restart\' and \'shutdown\' methods', function () {
        mockApp.should.have.property('restart').which.is.a.Function;
        mockApp.should.have.property('shutdown').which.is.a.Function;
    });
    
    it('should shutdown cleanly and resolve with the supplied exit code', function () {
        // assuming -123 isn't assigned here, testing to make sure it's passed along if no problems arise
        return mockApp.shutdown(-123).should.eventually.equal(-123);
    });
    
    it('should emit a \'shutdown\' event with an await function', function () {
        mockApp.once('shutdown', function (await) {
            await.should.be.a.Function;
            didCall();
        });
        return mockApp.shutdown();
    });
    
    it('should wait for a promise passed to \'await\' before completing shutdown', function () {
        mockApp.once('shutdown', function (await) {
            await(Promise.delay(40).then(didCall));
        });
        return mockApp.shutdown().then(wasCalled);
    });
    
    it('should wait for a node async function passed to \'await\' before completing shutdown', function () {
        mockApp.once('shutdown', function (await) {
            await(function (callback) {
                setTimeout(function () {
                    didCall();
                    callback();
                }, 40);
            });
        });
        return mockApp.shutdown().then(wasCalled);
    });
    
    it('should allow multiple calls to \'await\'', function () {
        mockApp.once('shutdown', function (await) {
            await(Promise.delay(20).then(didCall));
            await(Promise.delay(40).then(didCall));
        });
        return mockApp.shutdown().then(wasCalled(2));
    });
    
    it('should wait for \'await\' arguments even if they fail', function () {
        mockApp.once('shutdown', function (await) {
            await(Promise.reject('foo'));
            await(Promise.delay(40).then(didCall));
        });
        return mockApp.shutdown().then(wasCalled);
    });
    
    it('should resolve with SHUTDOWN_TIMEOUT_EXCEEDED if a timeout is specified and await handlers do not conclude', function () {
        mockApp.once('shutdown', function (await) {
            await(function () { });
        });
        return mockApp.shutdown('foo', 40).should.eventually.equal(EXIT_CODES.SHUTDOWN_TIMEOUT_EXCEEDED);
    });
    
    it('should emit an \'after shutdown\' event with errors', function () {
        var foo = { }; // errors should be passed along verbatim
        mockApp.once('shutdown', function (await) {
            await(Promise.reject(foo));
            didCall();
        });
        mockApp.once('after shutdown', function (result) {
            result.errors[0].should.equal(foo);
            didCall();
        });
        return mockApp.shutdown().then(wasCalled(2));
    });
    
    it('should include an error if \'await\' is called with an invalid argument', function () {
        mockApp.once('shutdown', function (await) {
            await(false);
            didCall();
        });
        mockApp.once('after shutdown', function (result) {
            result.errors.length.should.equal(1);
            didCall();
        });
        return mockApp.shutdown().then(wasCalled(2));
    });
    
    it('should emit an \'after shutdown\' event with handler promises if it times out', function () {
        mockApp.once('shutdown', function (await) {
            await(function () { });
            didCall();
        });
        mockApp.once('after shutdown', function (result) {
            result.cleanupHandlers[0].isPending().should.equal(true);
            didCall();
        });
        return mockApp.shutdown('foo', 40).then(wasCalled(2));
    });
    
    it('should allow the \'after shutdown\' event to alter the return code', function () {
        mockApp.once('after shutdown', function (result) {
            result.code = -123;
        });
        return mockApp.shutdown().should.eventually.equal(-123);
    });

    it('should emit a \'before shutdown\' event with the details', function () {
        mockApp.once('before shutdown', function (code, msg, timeout) {
            code.should.equal(-123);
            msg.should.equal('foo');
            timeout.should.equal(1234);
            didCall();
        });
        return mockApp.shutdown(-123, 'foo', 1234).then(wasCalled);
    });
});
