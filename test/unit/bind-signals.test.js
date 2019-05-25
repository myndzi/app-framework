'use strict';

var EE = require('events').EventEmitter,
    bindSignals = require('../../lib/bind-signals'),
    nullLogger = require('../../lib/null-logger');

require('should');

describe('bind-signals', function () {
    var app;

    function mock(enabled, fn) {
        app = new EE();
        app.enabled = enabled;

        app.config = { get: function () { return app.enabled; } };
        app.reconfigure = function (enabled) {
            app.enabled = enabled;
            app.emit('configure');
        };
        app.shutdown = fn;

        nullLogger(app);
        bindSignals(app);
        return app;
    }

    afterEach(function () {
        // clean up signal handlers
        app.emit('after shutdown');
    });

    describe('enabled', function () {
        it('should call shutdown on SIGINT', function (done) {
            var called = false;

            mock(true, function () { called = true; });

            process.once('SIGINT', function () {
                called.should.equal(true);
                done();
            });

            process.emit('SIGINT');
        });

        it('should call shutdown on SIGTERM', function (done) {
            var called = false;

            mock(true, function () { called = true; });

            process.once('SIGTERM', function () {
                called.should.equal(true);
                done();
            });

            process.emit('SIGTERM');
        });

        it('should forcefully exit if SIGINT is received while shutting down', function (done) {
            mock(true, function () {
                app.emit('shutdown');
            });
            var _proc_exit = process.exit;
            process.exit = function () {
                process.exit = _proc_exit;
                done();
            };
            process.emit('SIGINT');
            process.emit('SIGINT');
        });

        it('should forcefully exit if SIGTERM is received while shutting down', function (done) {
            mock(true, function () {
                app.emit('shutdown');
            });
            var _proc_exit = process.exit;
            process.exit = function () {
                process.exit = _proc_exit;
                done();
            };
            process.emit('SIGINT');
            process.emit('SIGINT');
        });
    });

    describe('disabled', function () {
        it('should NOT call shutdown on SIGINT', function (done) {
            var called = false;

            mock(false, function () { called = true; });

            process.once('SIGINT', function () {
                called.should.equal(false);
                done();
            });

            process.emit('SIGINT');
        });

        it('should NOT call shutdown on SIGTERM', function (done) {
            var called = false;

            mock(false, function () { called = true; });

            process.once('SIGTERM', function () {
                called.should.equal(false);
                done();
            });

            process.emit('SIGTERM');
        });
    });

    describe('live-enabled', function () {
        it('should call shutdown on SIGINT', function (done) {
            var called = false;

            mock(false, function () { called = true; });
            app.reconfigure(true);

            process.once('SIGINT', function () {
                called.should.equal(true);
                done();
            });

            process.emit('SIGINT');
        });

        it('should call shutdown on SIGTERM', function (done) {
            var called = false;

            mock(false, function () { called = true; });
            app.reconfigure(true);

            process.once('SIGTERM', function () {
                called.should.equal(true);
                done();
            });

            process.emit('SIGTERM');
        });

        it('should not re-bind multiple times', function () {
            mock(false, function () { });
            app.reconfigure(true);

            var sigintListeners = process.listeners('SIGINT'),
                sigtermListeners = process.listeners('SIGTERM');

            app.emit('configure');

            sigintListeners.length.should.equal(process.listeners('SIGINT').length);
            sigtermListeners.length.should.equal(process.listeners('SIGTERM').length);
        });
    });

    describe('live-disabled', function () {
        it('should NOT call shutdown on SIGINT', function (done) {
            var called = false;

            mock(true, function () { called = true; });
            app.reconfigure(false);

            process.once('SIGINT', function () {
                called.should.equal(false);
                done();
            });

            process.emit('SIGINT');
        });

        it('should call shutdown on SIGTERM', function (done) {
            var called = false;

            mock(true, function () { called = true; });
            app.reconfigure(false);

            process.once('SIGTERM', function () {
                called.should.equal(false);
                done();
            });

            process.emit('SIGTERM');
        });
    });
});
