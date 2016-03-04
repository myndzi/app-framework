'use strict';

require('should-eventually');

var App = require('../../lib/index');

describe('app.bindSignals', function () {
    var app;
    
    describe('enabled', function () {
        beforeEach(function () {
            return App({
                app: { root: __dirname, bindSignals: true }
            }).then(function (_app) {
                app = _app;
                return app.listen();
            });
        });
        afterEach(function () {
            return app.shutdown().tap(function () { app = null; });
        });
        
        it('should call shutdown when receiving SIGINT', function (done) {
            var called = false;
            app.once('shutdown', function () { called = true; });
            process.once('SIGINT', function () {
                called.should.equal(true);
                done();
            });
            process.emit('SIGINT');
        });
        it('should call shutdown when receiving SIGTERM', function (done) {
            var called = false;
            app.once('shutdown', function () { called = true; });
            process.once('SIGTERM', function () {
                called.should.equal(true);
                done();
            });
            process.emit('SIGTERM');
        });
    });
    
    describe('disabled', function () {
        beforeEach(function () {
            return App({
                app: { root: __dirname, bindSignals: false }
            }).then(function (_app) {
                app = _app;
                return app.listen();
            });
        });
        afterEach(function () {
            return app.shutdown().tap(function () { app = null; });
        });
        
        it('should NOT call shutdown when receiving SIGINT', function (done) {
            var called = false;
            app.once('shutdown', function () { called = true; });
            process.once('SIGINT', function () {
                called.should.equal(false);
                done();
            });
            process.emit('SIGINT');
        });
        it('should NOT call shutdown when receiving SIGTERM', function (done) {
            var called = false;
            app.once('shutdown', function () { called = true; });
            process.once('SIGTERM', function () {
                called.should.equal(false);
                done();
            });
            process.emit('SIGTERM');
        });
    });
    
    describe('live-enabled', function () {
        beforeEach(function () {
            return App({
                app: { root: __dirname, bindSignals: false }
            }).then(function (_app) {
                app = _app;
                return app.listen();
            }).then(function () {
                return new Promise(function (resolve) {
                    app.once('reconfigured', resolve);
                    app.configure({ app: { bindSignals: true } });
                });
            });
        });
        afterEach(function () {
            return app.shutdown().tap(function () { app = null; });
        });
        
        it('should call shutdown when receiving SIGINT', function (done) {
            var called = false;
            app.once('shutdown', function () { called = true; });
            process.once('SIGINT', function () {
                called.should.equal(true);
                done();
            });
            process.emit('SIGINT');
        });
        it('should call shutdown when receiving SIGTERM', function (done) {
            var called = false;
            app.once('shutdown', function () { called = true; });
            process.once('SIGTERM', function () {
                called.should.equal(true);
                done();
            });
            process.emit('SIGTERM');
        });
    });
    
    describe('live-disabled', function () {
        beforeEach(function () {
            return App({
                app: { root: __dirname, bindSignals: true }
            }).then(function (_app) {
                app = _app;
                return app.listen();
            }).then(function () {
                return new Promise(function (resolve) {
                    app.once('reconfigured', resolve);
                    app.configure({ app: { bindSignals: false } });
                });
            });
        });
        afterEach(function () {
            return app.shutdown().tap(function () { app = null; });
        });
        
        it('should call shutdown when receiving SIGINT', function (done) {
            var called = false;
            app.once('shutdown', function () { called = true; });
            process.once('SIGINT', function () {
                called.should.equal(false);
                done();
            });
            process.emit('SIGINT');
        });
        it('should call shutdown when receiving SIGTERM', function (done) {
            var called = false;
            app.once('shutdown', function () { called = true; });
            process.once('SIGTERM', function () {
                called.should.equal(false);
                done();
            });
            process.emit('SIGTERM');
        });
    });
});