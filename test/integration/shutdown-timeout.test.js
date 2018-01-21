'use strict';

require('should-eventually');

var App = require('../../lib/index');
var Promise = require('bluebird');

describe('app.shutdownTimeout', function () {
    it('should default to no timeout', function () {
        var theTimeout;
        return App({
            app: { root: __dirname }
        }).tap(function (app) {
            return app.listen();
        }).tap(function (app) {
            app.once('before shutdown', function (code, msg, timeout) {
                theTimeout = timeout;
            });
            return app.shutdown();
        }).tap(function () {
            (theTimeout === null).should.be.ok;
        });
    });

    it('should accept the specified value', function () {
        var theTimeout;
        return App({
            app: { root: __dirname, shutdownTimeout: 123 }
        }).tap(function (app) {
            return app.listen();
        }).tap(function (app) {
            app.once('before shutdown', function (code, msg, timeout) {
                theTimeout = timeout;
            });
            return app.shutdown();
        }).tap(function () {
            theTimeout.should.equal(123);
        });
    });

    it('should be reconfigurable', function () {
        var theTimeout;
        return App({
            app: { root: __dirname }
        }).tap(function (app) {
            return app.listen();
        }).tap(function (app) {
            app.once('before shutdown', function (code, msg, timeout) {
                theTimeout = timeout;
            });
            return new Promise(function (resolve) {
                app.on('reconfigured', resolve);
                app.configure({ app: { shutdownTimeout: 444 } });
            });
        }).tap(function (app) {
            return app.shutdown();
        }).tap(function () {
            theTimeout.should.equal(444);
        });
    });
});